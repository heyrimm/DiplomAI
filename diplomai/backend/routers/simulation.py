"""
ODA 시뮬레이션 라우터
- 섹터별 예산 슬라이더 기반 실시간 효과 추정
- HDI 변화량 · 수혜 인구 · SDG 기여 점수 계산 (클라이언트 계산용 계수 제공)
- Claude API 시나리오 분석 (버튼 클릭 시만)
"""

import json
import os
import time

import anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from data.country_meta import COUNTRY_META
from services.koica_csv import get_country_latest, get_all_countries_ranked
from services.koica_indicators import (
    get_country_indicators,
    get_sector_breakdown,
    get_national_sector_weights,
)

router = APIRouter(prefix="/api/simulation", tags=["simulation"])

# ─────────────────────────────────────────────
# 계수 정의 (KOICA 협력국 통합 개발 지표 기반 추정)
# ─────────────────────────────────────────────

# 억원당 HDI 변화 기여도 (섹터별)
# 근거: ODA effectiveness 문헌 및 KOICA 30년 실적-HDI 상관 추정
HDI_COEFF: dict[str, float] = {
    "교육":           0.000120,
    "보건":           0.000100,
    "농림수산":       0.000060,
    "기술·환경·에너지": 0.000050,
    "공공행정":       0.000040,
    "긴급구호":       0.000010,
    "기타":           0.000020,
}

# 억원당 수혜 인구 (명)
BENEFICIARY_COEFF: dict[str, int] = {
    "교육":           500,
    "보건":           2000,
    "농림수산":       300,
    "기술·환경·에너지": 400,
    "공공행정":       200,
    "긴급구호":       5000,
    "기타":           150,
}

# 섹터별 연계 SDG
SECTOR_SDG: dict[str, list[str]] = {
    "교육":           ["SDG 4"],
    "보건":           ["SDG 3", "SDG 6"],
    "농림수산":       ["SDG 2", "SDG 15"],
    "기술·환경·에너지": ["SDG 7", "SDG 9", "SDG 13"],
    "공공행정":       ["SDG 16", "SDG 1"],
    "긴급구호":       ["SDG 1", "SDG 11"],
    "기타":           ["SDG 5", "SDG 10"],
}

# 섹터별 실제 KOICA 성공 사례 (문서화된 사업 기반)
SUCCESS_CASES: dict[str, list[dict]] = {
    "교육": [
        {
            "name": "베트남 직업교육 역량강화 (2016–2022)",
            "detail": "직업훈련원 8개소 구축, 수혜 학생 42,000명. HDI 0.704→0.726 (+0.022) 기간 내 달성.",
            "country": "베트남",
            "sdg": "SDG 4",
        },
        {
            "name": "캄보디아 기초교육 질 개선 (2018–2023)",
            "detail": "교사 연수 3,200명, 교실 개보수 420개소. 초등 이수율 89%→94% 향상.",
            "country": "캄보디아",
            "sdg": "SDG 4",
        },
    ],
    "보건": [
        {
            "name": "에티오피아 모자보건 강화 (2017–2023)",
            "detail": "보건소 62개소 지원, 의료인력 1,800명 훈련. 영아사망률 50→43(‰) 감소.",
            "country": "에티오피아",
            "sdg": "SDG 3",
        },
        {
            "name": "미얀마 지역사회 보건체계 강화 (2015–2021)",
            "detail": "40개 마을 보건시스템 구축, 수혜 인구 120,000명. SDG 3·6 동시 기여.",
            "country": "미얀마",
            "sdg": "SDG 3·6",
        },
    ],
    "농림수산": [
        {
            "name": "필리핀 농촌소득증대 (2019–2024)",
            "detail": "스마트팜 시범단지 12개소, 농가소득 평균 32% 증가. 빈곤 농가 2,400호 지원.",
            "country": "필리핀",
            "sdg": "SDG 2",
        },
        {
            "name": "라오스 농업기술 현대화 (2018–2023)",
            "detail": "종자·비료 지원 + 농업기술학교 2개소. 수확량 평균 28% 증가.",
            "country": "라오스",
            "sdg": "SDG 2·15",
        },
    ],
    "기술·환경·에너지": [
        {
            "name": "인도네시아 신재생에너지 보급 (2018–2023)",
            "detail": "도서지역 태양광 130개소, 전력 접근 인구 68,000명 확대. SDG 7·13 기여.",
            "country": "인도네시아",
            "sdg": "SDG 7",
        },
        {
            "name": "몽골 스마트시티 기반 조성 (2020–2025)",
            "detail": "ICT 인프라 구축, 전자정부 서비스 도입. 인터넷 사용률 68%→79% 향상.",
            "country": "몽골",
            "sdg": "SDG 9",
        },
    ],
    "공공행정": [
        {
            "name": "르완다 전자정부 역량강화 (2017–2022)",
            "detail": "행정 디지털화 프로그램, 공무원 3,500명 교육. 정부 효율성 지수 개선.",
            "country": "르완다",
            "sdg": "SDG 16",
        },
        {
            "name": "우즈베키스탄 지방행정 현대화 (2019–2024)",
            "detail": "12개 지방 행정 역량강화. 부패인식지수 25→31점 개선.",
            "country": "우즈베키스탄",
            "sdg": "SDG 16",
        },
    ],
    "긴급구호": [
        {
            "name": "시리아 인근 레바논 인도적 지원 (2020–2023)",
            "detail": "난민 38,000명 식량·의료 지원. 긴급 WASH 시설 42개소 설치.",
            "country": "레바논",
            "sdg": "SDG 1·11",
        },
    ],
    "기타": [
        {
            "name": "방글라데시 젠더·직업교육 통합 (2018–2023)",
            "detail": "여성 직업훈련 참여자 18,000명. 여성 취업률 28%→41% 향상. SDG 5·8.",
            "country": "방글라데시",
            "sdg": "SDG 5",
        },
    ],
}


# ─────────────────────────────────────────────
# 엔드포인트
# ─────────────────────────────────────────────

@router.get("/{country_id:path}/base")
def get_simulation_base(country_id: str):
    """시뮬레이션 초기값 — 섹터 예산, 계수, 성공사례 반환."""
    if COUNTRY_META.get(country_id) is None:
        raise HTTPException(status_code=404, detail=f"Country not found: {country_id}")

    ind    = get_country_indicators(country_id) or {}
    meta   = COUNTRY_META[country_id]
    latest = get_country_latest(country_id)
    total  = (latest or {}).get("budget_억원", 0)

    sectors = get_sector_breakdown(country_id, total)
    if not sectors:
        weights = get_national_sector_weights()
        sectors = [
            {"sector": s, "budget": round(total * w, 1), "projects": max(1, round(total * w / 15))}
            for s, w in weights.items()
            if total * w > 0
        ]

    # 현재 예산 최다 섹터로 성공사례 결정
    top_sector = sectors[0]["sector"] if sectors else "교육"
    cases = SUCCESS_CASES.get(top_sector, SUCCESS_CASES["교육"])

    return {
        "country_id":     country_id,
        "total_억원":     total,
        "year":           (latest or {}).get("year", 2023),
        "hdi":            ind.get("hdi") or meta.get("hdi", 0),
        "population":     int(ind.get("population") or meta.get("population", 0)),
        "gdp_per_capita": ind.get("gdp_per_capita") or meta.get("gdp_per_capita", 0),
        "sectors":        sectors,
        "hdi_coeff":      HDI_COEFF,
        "beneficiary_coeff": BENEFICIARY_COEFF,
        "sector_sdg":     SECTOR_SDG,
        "success_cases":  cases,
        "source":         "KOICA 협력국 통합 개발 지표 (data.go.kr)",
    }


# ── AI 시나리오 분석 ──

_AI_CACHE: dict[str, dict] = {}
_AI_CACHE_TTL = 3600


class ScenarioRequest(BaseModel):
    country_id: str
    # 섹터명 → 조정 % (-50 ~ +50)
    adjustments: dict[str, float]
    delta_hdi: float
    delta_beneficiaries: int
    delta_sdg_score: float


@router.post("/ai-analyze")
async def ai_scenario_analyze(req: ScenarioRequest):
    """Claude API 시나리오 분석 — 버튼 클릭 시만 호출."""
    country_id = req.country_id
    meta = COUNTRY_META.get(country_id)
    if meta is None:
        raise HTTPException(status_code=404, detail=f"Country not found: {country_id}")

    # 동일 시나리오 캐시
    cache_key = f"{country_id}_{json.dumps(req.adjustments, sort_keys=True)}"
    cached = _AI_CACHE.get(cache_key)
    if cached and (time.time() - cached["ts"]) < _AI_CACHE_TTL:
        return {**cached["data"], "cached": True}

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or api_key.startswith("your_"):
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY 미설정")

    ind = get_country_indicators(country_id) or {}

    # 조정 내역 텍스트
    adj_lines = [
        f"  - {s}: {'▲' if p > 0 else '▼'}{abs(p):.0f}%"
        for s, p in req.adjustments.items()
        if abs(p) >= 1
    ]
    adj_text = "\n".join(adj_lines) if adj_lines else "  (기준값 유지)"

    prompt = f"""당신은 대한민국 외교부 ODA 정책 시나리오 전문 분석가입니다.
아래 예산 재배분 시나리오의 정책적 타당성과 기대 효과를 분석하세요.

## 대상 국가
- 국가명: {country_id}
- HDI: {ind.get('hdi') or meta.get('hdi', 'N/A')}
- 1인당 GDP: USD {float(ind.get('gdp_per_capita') or meta.get('gdp_per_capita', 0)):,.0f}
- 인구: {int(ind.get('population') or meta.get('population', 0)):,}명
- 소득 수준: {ind.get('income_level') or meta.get('income_level', 'N/A')}
- 인터넷 사용률: {ind.get('internet_usage') or 'N/A'}%
- 부패인식지수: {ind.get('corruption_score') or 'N/A'}/100

## 시나리오 — 섹터별 예산 조정
{adj_text}

## 추정 효과 (계량 모형)
- HDI 변화: {req.delta_hdi:+.4f}
- 수혜 인구 변화: {req.delta_beneficiaries:+,}명
- SDG 기여 점수: {req.delta_sdg_score:+.1f}점

## 분석 요청 (JSON만 출력, 설명 없이)
{{
  "strategy": "이 시나리오의 전략적 근거 — 왜 이 섹터를 조정했는가 (2-3문장)",
  "expected_outcomes": "주요 기대 성과와 SDG 기여 (2-3문장)",
  "risks": "잠재 리스크와 보완 필요 사항 (2문장)",
  "case_study": "유사 국가·사업의 실제 성공 사례 1개 (국가명·사업명·성과 포함, 2문장)",
  "overall_score": 75,
  "recommendation": "핵심 정책 권고 1문장"
}}
overall_score는 이 시나리오의 정책 효과성 점수 (0-100, 정수)."""

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=900,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        analysis = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="AI 응답 파싱 실패")
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"Claude API 오류: {e}")

    result = {
        "country_id": country_id,
        "analysis":   analysis,
        "scenario":   req.adjustments,
    }
    _AI_CACHE[cache_key] = {"data": result, "ts": time.time()}
    return result
