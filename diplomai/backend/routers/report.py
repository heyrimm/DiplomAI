import os, time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import anthropic

from data.country_meta import COUNTRY_META
from services.koica_csv import get_country_latest, get_country_history
from services.public_diplomacy import get_sejong, get_diaspora

router = APIRouter(prefix="/api/report", tags=["report"])

_CACHE: dict[str, dict] = {}
_CACHE_TTL = 3600


class ReportRequest(BaseModel):
    country_id: str
    sections: list[str]


@router.post("/generate")
async def generate_report(req: ReportRequest):
    country_id = req.country_id
    meta = COUNTRY_META.get(country_id)
    if not meta:
        raise HTTPException(status_code=404, detail=f"Country not found: {country_id}")

    cache_key = f"{country_id}:{','.join(sorted(req.sections))}"
    cached = _CACHE.get(cache_key)
    if cached and (time.time() - cached["ts"]) < _CACHE_TTL:
        return {**cached["data"], "cached": True}

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or api_key.startswith("your_"):
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY가 설정되지 않았습니다.")

    latest  = get_country_latest(country_id)
    history = get_country_history(country_id)
    sejong  = get_sejong(country_id)
    diaspora = get_diaspora(country_id)

    history_str = " / ".join(
        f"{r['year']}년 {r['budget_억원']}억원" for r in history[-5:]
    ) if history else "없음"

    yoy_str = f"{latest['yoy_pct']}%" if latest and latest.get("yoy_pct") is not None else "없음"
    sejong_str = f"{sejong['latest']:,}명 (전년비 {sejong['yoy']:+.1f}%)" if sejong and sejong.get("yoy") is not None else (f"{sejong['latest']:,}명" if sejong else "없음")
    diaspora_str = f"{diaspora:,}명" if diaspora else "없음"

    prompt = f"""당신은 대한민국 외교부·KOICA 공공외교 사업 기획 전문가입니다.
아래 국가 데이터를 바탕으로 사업기획 보고서용 **종합 전략 분석** (한국어, 3~4문장)을 작성하세요.
핵심 수치를 직접 인용하고, ODA와 공공외교 양축을 모두 언급하세요.
출력은 순수 텍스트만 (마크다운, 헤더, 기호 없이).

## 국가: {country_id} ({meta.get('name_en', '')})
- 지역: {meta.get('region', '')} | 소득: {meta.get('income_level', '')} | HDI: {meta.get('hdi', 0)}
- KOICA 최근 지원: {f"{latest['budget_억원']}억원 ({latest['year']}년), 전년비 {yoy_str}" if latest else "없음"}
- 최근 5년 추이: {history_str}
- 한국어 학습자 (세종학당): {sejong_str}
- 재외동포: {diaspora_str}"""

    try:
        client = anthropic.Anthropic(api_key=api_key)
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        executive_summary = msg.content[0].text.strip()
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"Claude API 오류: {e}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"보고서 생성 실패: {e}")

    result = {"country_id": country_id, "executive_summary": executive_summary}
    _CACHE[cache_key] = {"data": result, "ts": time.time()}
    return result
