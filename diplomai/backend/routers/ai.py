import json
import os
import re
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import anthropic

from data.country_meta import COUNTRY_META
from services.koica_csv import get_country_latest, get_country_history
from services.public_diplomacy import get_sejong, get_diaspora
from services.kf_data import get_kf_projects, get_korean_studies

router = APIRouter(prefix="/api/ai", tags=["ai"])

# 메모리 캐시: 같은 국가 재호출 방지 (TTL 1시간)
_CACHE: dict[str, dict] = {}
_CACHE_TTL = 3600


class RecommendationRequest(BaseModel):
    country_id: str


def _build_prompt(
    country_id: str, meta: dict, latest: dict | None, history: list,
    sejong: dict | None, diaspora: int | None,
    kf_projects: dict | None = None, korean_studies: dict | None = None,
) -> str:
    history_str = ""
    if history:
        recent = history[-5:]
        history_str = " / ".join(f"{r['year']}년 {r['budget_억원']}억원" for r in recent)

    sejong_str = (
        f"{sejong['latest']:,}명 (전년비 {sejong['yoy']:+.1f}%)"
        if sejong and sejong.get("yoy") is not None
        else (f"{sejong['latest']:,}명" if sejong else "없음")
    )
    diaspora_str = f"{diaspora:,}명" if diaspora else "없음"

    return f"""당신은 대한민국 외교부 ODA·공공외교 전문 분석가입니다.
아래 국가 데이터를 바탕으로 맞춤형 사업 추천 5건을 생성하세요.
- ODA 개발협력 사업 추천 3건 (type: "oda")
- 공공외교 강화 사업 추천 2건 (type: "diplomacy")
공공외교 추천은 KF 사업 이력·한국학 현황을 근거로 하세요 (예: 세종학당 수요는 큰데 한국학 학위과정이 없으면 지식외교 확장, KF 사업 공백이면 신규 채널 개설).

## 대상 국가
- 국가명: {country_id} ({meta.get('name_en', '')})
- 지역: {meta.get('region', '')} | 소득: {meta.get('income_level', '')}
- 인구: {meta.get('population', 0):,}명 | 1인당 GDP: USD {meta.get('gdp_per_capita', 0):,}
- HDI: {meta.get('hdi', 0)} (1에 가까울수록 높음)

## KOICA ODA 지원 실적 (KOICA ODA 실적 CSV · data.go.kr)
- 최근 연도: {latest.get('year', 'N/A') if latest else 'N/A'}년 {latest.get('budget_억원', 0) if latest else 0}억원
- 전년 대비: {(str(latest.get('yoy_pct')) + '%') if latest and latest.get('yoy_pct') is not None else '데이터 없음'}
- 최근 5년 추이: {history_str or '데이터 없음'}

## 공공외교 현황 (세종학당재단 수강생 통계·외교부 재외동포현황 · data.go.kr)
- 세종학당 한국어 학습자: {sejong_str}
- 재외동포: {diaspora_str}

## KF 공공외교 사업 이력 (KF 융합 공공외교·ODA 사업정보 · data.go.kr)
- 누적 사업: {f"{kf_projects['total']}건 ({kf_projects['first_year']}~{kf_projects['last_year']}년)" if kf_projects else "이력 없음 — 공공외교 채널 공백 상태"}
- 최근 사업 예시: {" / ".join(p["name"][:35] for p in kf_projects["recent"][:3]) if kf_projects else "없음"}

## 한국학 현황 (KF 해외대학 한국학 과정 운영현황 · data.go.kr)
- 한국학 운영 대학: {f"{korean_studies['universities']}곳 (학사 {korean_studies['bachelor']}·석사 {korean_studies['master']}·박사 {korean_studies['doctoral']})" if korean_studies else "없음"}

## 출력 형식 (JSON 배열만, 마크다운 없이)
[
  {{
    "type": "oda",
    "title": "사업명 (20자 이내)",
    "sector": "분야 (교육/보건/농업·농촌개발/환경/거버넌스/산업·에너지/젠더/물·위생 중 택1)",
    "budget_estimate": "XX억원",
    "duration": "X년",
    "rationale": "추진 근거 (국가 데이터 기반, 150자 이내)",
    "expected_impact": "기대 효과 (80자 이내)",
    "priority": "high 또는 medium",
    "sdg": ["SDG X", "SDG Y"],
    "data_citation": "인용 데이터 출처 (예: KOICA ODA 실적 CSV · data.go.kr)"
  }},
  {{
    "type": "diplomacy",
    "title": "공공외교 사업명 (20자 이내)",
    "sector": "공공외교",
    "budget_estimate": "XX억원",
    "duration": "X년",
    "rationale": "추진 근거 (세종학당·재외동포 데이터 인용, 150자 이내)",
    "expected_impact": "기대 효과 (80자 이내)",
    "priority": "high 또는 medium",
    "sdg": ["SDG 17"],
    "data_citation": "인용 데이터 출처 (예: 세종학당재단 수강생 통계 · data.go.kr)"
  }}
]

반드시 JSON 배열만 출력하세요. ODA 3건 + 공공외교 2건 = 총 5건. 설명, 마크다운 코드블록 없이 순수 JSON만."""


@router.post("/recommend")
async def get_recommendations(req: RecommendationRequest):
    country_id = req.country_id
    meta = COUNTRY_META.get(country_id)
    if meta is None:
        raise HTTPException(status_code=404, detail=f"Country not found: {country_id}")

    # 캐시 확인 — 같은 국가는 1시간 내 재호출 없음
    cached = _CACHE.get(country_id)
    if cached and (time.time() - cached["ts"]) < _CACHE_TTL:
        return {**cached["data"], "cached": True}

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or api_key.startswith("your_"):
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY가 설정되지 않았습니다.")

    latest   = get_country_latest(country_id)
    history  = get_country_history(country_id)
    sejong   = get_sejong(country_id)
    diaspora = get_diaspora(country_id)
    kf_proj  = get_kf_projects(country_id)
    kstudies = get_korean_studies(country_id)
    prompt   = _build_prompt(country_id, meta, latest, history, sejong, diaspora, kf_proj, kstudies)

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:].strip()
        # fallback: extract JSON array if model added preamble text
        if not raw.startswith("["):
            m = re.search(r"\[.*\]", raw, re.DOTALL)
            raw = m.group(0) if m else raw
        recommendations = json.loads(raw)
        if not isinstance(recommendations, list):
            recommendations = []
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="AI 응답 파싱 실패")
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"Claude API 오류: {e}")

    result = {
        "country_id": country_id,
        "country_name": country_id,
        "recommendations": recommendations,
    }
    _CACHE[country_id] = {"data": result, "ts": time.time()}
    return result
