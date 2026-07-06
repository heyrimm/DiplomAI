import json
import math
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
from services.koica_indicators import (
    get_sector_proportions,
    get_regional_sector_proportions,
    get_sdg_goals,
)

router = APIRouter(prefix="/api/ai", tags=["ai"])

# KOICA 분야 분류 (협력국 통합 개발 지표 CSV 기준)
CANONICAL_SECTORS = [
    "공공행정", "교육", "기술·환경·에너지", "긴급구호", "농림수산", "보건", "기타",
]

# 메모리 캐시: 같은 국가 재호출 방지 (TTL 1시간)
_CACHE: dict[str, dict] = {}
_EVAL_CACHE: dict[str, dict] = {}
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

rationale에서 수치를 인용할 때는 [[수치|출처]] 형식으로 감싸세요 (예: [[17,821명|세종학당재단 수강생 통계·data.go.kr]]). 위 데이터에 없는 수치는 만들지 마세요.
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


# ══════════════════════════════════════════════════════════════
#  사업 아이템 타당성 진단 (하이브리드: 규칙기반 점수 + LLM 정성분석)
# ══════════════════════════════════════════════════════════════

class EvaluateRequest(BaseModel):
    country_id: str
    item: str | None = None       # 텍스트 사업 아이템 설명
    pdf_base64: str | None = None  # 첨부 사업계획서 PDF (base64)
    pdf_name: str | None = None


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _score_components(
    country_id: str, meta: dict, latest: dict | None,
    sejong: dict | None, diaspora: int | None, kf_proj: dict | None,
    sector: str,
) -> list[dict]:
    """우리 공공데이터에 근거해 5개 항목 점수(총 100)를 계산."""
    region_ko = meta.get("region", "")

    # ── 1. 분야 적합도·사각지대 (35) — 협력국 통합 개발 지표 CSV
    country_props = get_sector_proportions(country_id) or {}
    reg_props     = get_regional_sector_proportions(region_ko) or {}
    c_pct = country_props.get(sector, 0.0)
    r_pct = reg_props.get(sector, 0.0)
    if r_pct > 0:
        ratio = (c_pct / r_pct) if c_pct > 0 else 0.0
        if   ratio <= 0.50: s1 = 35.0
        elif ratio <= 0.85: s1 = 34 - (ratio - 0.50) / 0.35 * 6
        elif ratio <= 1.15: s1 = 27 - (ratio - 0.85) / 0.30 * 7
        elif ratio <= 1.50: s1 = 20 - (ratio - 1.15) / 0.35 * 6
        else:               s1 = 12.0
        tag = ("사각지대 — 진입 여지 큼" if ratio < 0.85
               else "이미 집중 투입 분야" if ratio > 1.3 else "지역평균과 균형")
        note1 = (f"이 국가 {sector} 비중 [[{c_pct*100:.1f}%|협력국 통합 개발 지표·data.go.kr]] "
                 f"vs 지역평균 {r_pct*100:.1f}% (비율 {ratio:.2f}) — {tag}")
    else:
        s1, note1 = 18.0, f"{sector} 지역평균 데이터 없음 — 중립 평가"

    # ── 2. 개발 니즈 (25) — HDI · 소득수준
    hdi = float(meta.get("hdi") or 0.6)
    income = meta.get("income_level", "")
    base = _clamp((0.80 - hdi) / (0.80 - 0.40), 0, 1) * 22
    inc_bonus = {"최빈개도국": 3, "중하위소득국": 2, "중상위소득국": 0}.get(income, 1)
    s2 = _clamp(base + inc_bonus, 0, 25)
    lvl2 = "높음" if s2 >= 17 else "중간" if s2 >= 9 else "낮음"
    note2 = f"HDI [[{hdi}|UNDP 인간개발지수]] · {income} — 개발 니즈 {lvl2}"

    # ── 3. ODA 채널·예산 여력 (20) — KOICA ODA 실적 CSV
    budget = (latest or {}).get("budget_억원", 0) or 0
    yoy = (latest or {}).get("yoy_pct")
    mag = min(16.0, math.log10(budget + 1) / math.log10(301) * 16) if budget > 0 else 0.0
    trend = 4 if (yoy is not None and yoy > 0) else (2 if yoy is not None else 0)
    s3 = _clamp(mag + trend, 0, 20)
    note3 = (f"KOICA 최근 지원 [[{budget}억원|KOICA ODA 실적·data.go.kr]]"
             + (f", 전년비 {yoy:+.0f}%" if yoy is not None else "")
             + " — 이행 채널 " + ("탄탄" if s3 >= 13 else "보통" if s3 >= 7 else "취약"))

    # ── 4. 공공외교 연계·소프트파워 (10) — 세종학당·KF·재외동포
    s4, parts = 0.0, []
    if sejong and sejong.get("latest"):
        s4 += 4; parts.append(f"세종학당 학습자 {sejong['latest']:,}명")
    if kf_proj and kf_proj.get("total"):
        s4 += 4; parts.append(f"KF 사업 {kf_proj['total']}건")
    if diaspora:
        s4 += 2; parts.append(f"재외동포 {diaspora:,}명")
    s4 = min(10.0, s4)
    note4 = " · ".join(parts) if parts else "한국 공공외교 발자국 적음"

    # ── 5. SDG 정합 (10) — KOICA SDG 매핑
    sdgs = get_sdg_goals(sector)
    n = len(sdgs)
    s5 = 10.0 if n >= 2 else 6.0 if n == 1 else 3.0
    note5 = f"{sector} 연계 SDG {n}개" + (f": {', '.join(sdgs)}" if sdgs else "")

    return [
        {"label": "분야 적합도·사각지대", "score": round(s1), "max": 35, "note": note1},
        {"label": "개발 니즈",           "score": round(s2), "max": 25, "note": note2},
        {"label": "ODA 채널·예산 여력",   "score": round(s3), "max": 20, "note": note3},
        {"label": "공공외교 연계",        "score": round(s4), "max": 10, "note": note4},
        {"label": "SDG 정합",            "score": round(s5), "max": 10, "note": note5},
    ]


def _build_eval_prompt(
    country_id: str, meta: dict, latest: dict | None, history: list,
    sejong: dict | None, diaspora: int | None,
    kf_proj: dict | None, kstudies: dict | None,
    item: str, has_pdf: bool = False,
) -> str:
    history_str = " / ".join(
        f"{r['year']}년 {r['budget_억원']}억원" for r in (history or [])[-5:]
    ) or "데이터 없음"

    if has_pdf:
        item_section = (
            "## 사용자 제안 사업 (첨부 PDF 사업계획서)\n"
            "첨부된 PDF 사업계획서를 분석 대상으로 삼으세요."
            + (f"\n추가 메모: \"{item}\"" if item else "")
        )
    else:
        item_section = f'## 사용자 제안 사업 아이템\n"{item}"'

    return f"""당신은 대한민국 외교부 ODA·공공외교 사업 심사관입니다.
사용자가 제안한 사업을 아래 국가 공공데이터에 비추어 정성 평가하세요.

{item_section}

## 대상 국가: {country_id} ({meta.get('name_en','')})
- 지역 {meta.get('region','')} | 소득 {meta.get('income_level','')} | HDI {meta.get('hdi','')}
- 인구 {meta.get('population',0):,}명 | 1인당 GDP USD {meta.get('gdp_per_capita',0):,}
- KOICA 최근 지원: {(latest or {}).get('budget_억원',0)}억원 (5년 추이: {history_str})
- 세종학당 학습자: {sejong.get('latest') if sejong else '없음'} | 재외동포: {diaspora or '없음'}
- KF 사업 누적: {kf_proj['total'] if kf_proj else 0}건 | 한국학 운영대학: {kstudies['universities'] if kstudies else 0}곳

## 분야 분류 (반드시 아래 중 택1, 점수 계산에 사용됨)
{", ".join(CANONICAL_SECTORS)}

## 출력 형식 (JSON 객체만, 마크다운 없이)
{{
  "sector": "위 분야 목록 중 이 사업과 가장 가까운 것 1개",
  "summary": "한 줄 총평 (60자 이내)",
  "strengths": ["데이터 근거 강점 2~3개, 각 60자 이내"],
  "risks": ["리스크·주의점 2~3개, 각 60자 이내"],
  "reasoning": "종합 판단 근거 (200자 이내, 국가 데이터 인용)",
  "similar_precedents": ["해당국 KOICA/KF 이력 중 유사 선례 (없으면 빈 배열)"],
  "adjustments": ["사업 성공 확률을 높일 구체 조정안 2~3개"]
}}

수치를 인용할 때는 [[수치|출처]] 형식으로 감싸세요. 위 데이터에 없는 수치는 지어내지 마세요.
반드시 JSON 객체만 출력하세요."""


@router.post("/evaluate")
async def evaluate_item(req: EvaluateRequest):
    country_id = req.country_id
    item = (req.item or "").strip()
    pdf_b64 = (req.pdf_base64 or "").strip()
    has_pdf = bool(pdf_b64)
    if not item and not has_pdf:
        raise HTTPException(status_code=400, detail="사업 아이템 텍스트 또는 PDF를 입력하세요.")
    # base64 ~ 원본의 4/3 배. 32MB 원본 ≈ 43MB base64 제한
    if has_pdf and len(pdf_b64) > 43_000_000:
        raise HTTPException(status_code=413, detail="PDF가 너무 큽니다 (32MB 이하로 올려주세요).")
    meta = COUNTRY_META.get(country_id)
    if meta is None:
        raise HTTPException(status_code=404, detail=f"Country not found: {country_id}")

    src_key = f"pdf:{req.pdf_name}:{len(pdf_b64)}" if has_pdf else item.lower()
    cache_key = f"{country_id}::{src_key}"
    cached = _EVAL_CACHE.get(cache_key)
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
    prompt   = _build_eval_prompt(
        country_id, meta, latest, history, sejong, diaspora, kf_proj, kstudies,
        item, has_pdf=has_pdf,
    )

    content: list = []
    if has_pdf:
        content.append({
            "type": "document",
            "source": {"type": "base64", "media_type": "application/pdf", "data": pdf_b64},
        })
    content.append({"type": "text", "text": prompt})

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1500,
            messages=[{"role": "user", "content": content}],
        )
        raw = message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:].strip()
        if not raw.startswith("{"):
            m = re.search(r"\{.*\}", raw, re.DOTALL)
            raw = m.group(0) if m else raw
        analysis = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="AI 응답 파싱 실패")
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"Claude API 오류: {e}")

    sector = analysis.get("sector", "")
    if sector not in CANONICAL_SECTORS:
        sector = "기타"

    components = _score_components(
        country_id, meta, latest, sejong, diaspora, kf_proj, sector,
    )
    total = sum(c["score"] for c in components)
    grade = "유망" if total >= 70 else "조건부" if total >= 45 else "재검토"

    item_label = item or (f"📄 {req.pdf_name}" if req.pdf_name else "📄 PDF 사업계획서")
    result = {
        "country_id": country_id,
        "item": item_label,
        "source": "pdf" if has_pdf else "text",
        "sector": sector,
        "score": total,
        "grade": grade,
        "components": components,
        "summary": analysis.get("summary", ""),
        "strengths": analysis.get("strengths", []),
        "risks": analysis.get("risks", []),
        "reasoning": analysis.get("reasoning", ""),
        "similar_precedents": analysis.get("similar_precedents", []),
        "adjustments": analysis.get("adjustments", []),
    }
    _EVAL_CACHE[cache_key] = {"data": result, "ts": time.time()}
    return result
