import json
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import anthropic

from data.country_meta import COUNTRY_META
from services.koica_csv import get_country_latest, get_country_history

router = APIRouter(prefix="/api/ai", tags=["ai"])


class RecommendationRequest(BaseModel):
    country_id: str


def _build_prompt(country_id: str, meta: dict, latest: dict | None, history: list) -> str:
    history_str = ""
    if history:
        recent = history[-5:]
        history_str = " / ".join(f"{r['year']}년 {r['budget_억원']}억원" for r in recent)

    return f"""당신은 대한민국 외교부 ODA(공적개발원조) 전문 분석가입니다.
아래 국가 데이터를 바탕으로 KOICA ODA 사업 추천 3건을 생성하세요.

## 대상 국가
- 국가명: {country_id}
- 영문명: {meta.get('name_en', '')}
- 지역: {meta.get('region', '')}
- 소득 수준: {meta.get('income_level', '')}
- 인구: {meta.get('population', 0):,}명
- 1인당 GDP: USD {meta.get('gdp_per_capita', 0):,}
- HDI: {meta.get('hdi', 0)} (1에 가까울수록 높음)

## KOICA 지원 실적 (data.go.kr)
- 최근 연도: {latest.get('year', 'N/A') if latest else 'N/A'}년 {latest.get('budget_억원', 0) if latest else 0}억원
- 전년 대비: {(str(latest.get('yoy_pct')) + '%') if latest and latest.get('yoy_pct') is not None else '데이터 없음'}
- 최근 5년 추이: {history_str or '데이터 없음'}

## 출력 형식 (JSON 배열만, 마크다운 없이)
[
  {{
    "title": "사업명 (20자 이내)",
    "sector": "분야 (교육/보건/농업·농촌개발/환경/거버넌스/산업·에너지/젠더/물·위생 중 택1)",
    "budget_estimate": "XX억원",
    "duration": "X년",
    "rationale": "추진 근거 (국가 데이터 기반, 150자 이내)",
    "expected_impact": "기대 효과 (80자 이내)",
    "priority": "high 또는 medium",
    "sdg": ["SDG X", "SDG Y"]
  }}
]

반드시 JSON 배열만 출력하세요. 설명, 마크다운 코드블록 없이 순수 JSON만."""


@router.post("/recommend")
async def get_recommendations(req: RecommendationRequest):
    country_id = req.country_id
    meta = COUNTRY_META.get(country_id)
    if meta is None:
        raise HTTPException(status_code=404, detail=f"Country not found: {country_id}")

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or api_key.startswith("your_"):
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY가 설정되지 않았습니다.")

    latest = get_country_latest(country_id)
    history = get_country_history(country_id)

    prompt = _build_prompt(country_id, meta, latest, history)

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()

        # JSON 파싱
        # 코드블록 감싸인 경우 제거
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        recommendations = json.loads(raw)
        if not isinstance(recommendations, list):
            recommendations = []

    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="AI 응답 파싱 실패")
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"Claude API 오류: {e}")

    return {
        "country_id": country_id,
        "country_name": country_id,
        "recommendations": recommendations,
    }
