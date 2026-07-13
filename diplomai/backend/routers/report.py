"""
보고서·사업계획서 초안 생성 라우터
- mode="summary": 국가 종합 전략 분석 (3~4문장)
- mode="plan":    공공외교·ODA 사업계획서 초안 (구조화 JSON — 배경/목표/대상/활동/예산/KPI/리스크)
"""

import json
import os
import re
import time
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator
import anthropic

from data.country_meta import COUNTRY_META
from services.koica_csv import get_country_latest, get_country_history
from services.public_diplomacy import get_sejong, get_diaspora
from services.kf_data import get_kf_projects, get_korean_studies, get_africa_exchanges
from services.mofa_api import fetch_travel_alarm
from routers.oda import get_oda_gaps

router = APIRouter(prefix="/api/report", tags=["report"])

_CACHE: dict[str, dict] = {}
_CACHE_TTL = 3600

# 시연 품질이 필요하면 REPORT_MODEL=claude-sonnet-5 로 상향
_MODEL = os.getenv("REPORT_MODEL", "claude-haiku-4-5-20251001")


class ReportRequest(BaseModel):
    country_id: str = Field(max_length=50)
    sections: list[str] = Field(default_factory=list, max_length=10)
    mode: Literal["summary", "plan"] = "summary"
    base_recommendation: dict | None = None  # AI 추천 사업 1건을 계획서의 기반으로

    @field_validator("sections")
    @classmethod
    def _cap_section_len(cls, v: list[str]) -> list[str]:
        return [s[:32] for s in v]


# base_recommendation은 사용자 제어 입력이 프롬프트에 들어가므로 키 화이트리스트 + 길이 제한
_BASE_REC_KEYS = ("title", "type", "sector", "budget_estimate", "duration", "rationale", "expected_impact")


def _sanitize_base_rec(rec: dict | None) -> dict | None:
    if not isinstance(rec, dict):
        return None
    clean = {k: str(rec[k])[:300] for k in _BASE_REC_KEYS if rec.get(k)}
    return clean or None


def _get_client() -> anthropic.Anthropic:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or api_key.startswith("your_"):
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY가 설정되지 않았습니다.")
    return anthropic.Anthropic(api_key=api_key)


def _country_data_block(country_id: str, meta: dict) -> str:
    latest   = get_country_latest(country_id)
    history  = get_country_history(country_id)
    sejong   = get_sejong(country_id)
    diaspora = get_diaspora(country_id)

    history_str = " / ".join(
        f"{r['year']}년 {r['budget_억원']}억원" for r in history[-5:]
    ) if history else "없음"
    yoy_str = f"{latest['yoy_pct']}%" if latest and latest.get("yoy_pct") is not None else "없음"
    sejong_str = (
        f"{sejong['latest']:,}명 (전년비 {sejong['yoy']:+.1f}%)"
        if sejong and sejong.get("yoy") is not None
        else (f"{sejong['latest']:,}명" if sejong else "없음")
    )
    diaspora_str = f"{diaspora:,}명" if diaspora else "없음"

    kf_proj  = get_kf_projects(country_id)
    kstudies = get_korean_studies(country_id)
    kf_str = (
        f"{kf_proj['total']}건 누적 ({kf_proj['first_year']}~{kf_proj['last_year']}년), 최근: "
        + " / ".join(p["name"][:30] for p in kf_proj["recent"][:3])
        if kf_proj else "이력 없음 — 공공외교 채널 공백"
    )
    kstudies_str = (
        f"{kstudies['universities']}곳 (학사 {kstudies['bachelor']}·석사 {kstudies['master']}·박사 {kstudies['doctoral']})"
        if kstudies else "없음"
    )

    return f"""## 국가: {country_id} ({meta.get('name_en', '')})
- 지역: {meta.get('region', '')} | 소득: {meta.get('income_level', '')} | HDI: {meta.get('hdi', 0)}
- 인구: {meta.get('population', 0):,}명 | 1인당 GDP: USD {meta.get('gdp_per_capita', 0):,}
- KOICA 최근 지원: {f"{latest['budget_억원']}억원 ({latest['year']}년), 전년비 {yoy_str}" if latest else "없음"} (출처: KOICA 국가별 지원실적 CSV · data.go.kr)
- 최근 5년 추이: {history_str}
- 한국어 학습자 (세종학당재단·문체부 산하): {sejong_str}
- 재외동포 (외교부 재외동포현황 2021): {diaspora_str}
- KF 공공외교 사업 이력 (KF 융합 데이터 · data.go.kr): {kf_str}
- 한국학 운영 대학 (KF 한국학 과정 현황 · data.go.kr): {kstudies_str}"""


def _gaps_block(country_id: str) -> str:
    try:
        gaps_res = get_oda_gaps(country_id)
        gaps = gaps_res.get("gaps", [])
    except Exception:
        gaps = []
    if not gaps:
        return "- 감지된 사각지대 없음"
    return "\n".join(
        f"- {g['sector']}: 현재 {g['current_budget']}억원, 지역평균 대비 {g['gap_percent']}% 부족 (비율 {g['ratio']})"
        for g in gaps
    ) + "\n(출처: KOICA 지역별 지원실적 CSV 실계산 · data.go.kr)"


def _extract_json(raw: str) -> str:
    """모델 출력에서 JSON 본문만 추출 (ai.py 패턴 + 객체 대응)."""
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:].strip()
    if not raw.startswith(("{", "[")):
        m = re.search(r"\{.*\}|\[.*\]", raw, re.DOTALL)
        raw = m.group(0) if m else raw
    return raw


PLAN_SCHEMA = """{
  "title": "사업명 (30자 이내)",
  "type": "oda 또는 diplomacy",
  "background": "추진 배경 — 위 데이터의 수치를 2개 이상 직접 인용, 3~4문장",
  "objectives": ["사업 목표 2~3개"],
  "target_beneficiaries": "대상·수혜자 정의 (규모 추정 포함)",
  "activities": [{"name": "활동명", "description": "세부 내용 1~2문장"}],
  "budget_plan": [{"item": "예산 항목", "amount": "XX억원"}],
  "duration": "X년",
  "kpis": [{"indicator": "성과지표", "target": "목표치 (측정 가능한 수치)"}],
  "risks": [{"risk": "리스크 (여행경보 단계가 있으면 반드시 반영)", "mitigation": "대응 방안"}],
  "data_citations": ["인용한 공공데이터 출처 목록"]
}"""


async def _generate_plan(country_id: str, meta: dict, base_rec: dict | None) -> dict:
    alarm = await fetch_travel_alarm(country_id)
    alarm_str = (
        f"{alarm.get('level_label', '')} (단계 {alarm.get('level', '')})"
        if alarm else "정보 없음"
    )

    africa_block = ""
    exchanges = get_africa_exchanges(country_id) if "아프리카" in meta.get("region", "") else None
    if exchanges:
        cases_str = "\n".join(
            f"- {c['province']} {c['city']} ({c['year']}, {c['type']}): {c['desc'][:50]}"
            for c in exchanges["cases"][:3]
        )
        africa_block = f"""

## 국내 지자체 교류 선례 (한아프리카재단 지자체-아프리카 교류협력 사례 · data.go.kr)
누적 {exchanges['total']}건. 최근 사례:
{cases_str}
→ 활동 설계 시 기존 지자체 교류와의 연계 가능성을 검토하세요."""

    base_block = ""
    if base_rec:
        base_block = f"""
## 기반 사업 (AI 추천 중 사용자가 선택 — 이 사업을 구체화할 것)
- 사업명: {base_rec.get('title', '')}
- 유형: {'공공외교' if base_rec.get('type') == 'diplomacy' else 'ODA'} | 분야: {base_rec.get('sector', '')}
- 예산 규모: {base_rec.get('budget_estimate', '')} | 기간: {base_rec.get('duration', '')}
- 추진 근거: {base_rec.get('rationale', '')}
- 기대 효과: {base_rec.get('expected_impact', '')}"""

    prompt = f"""당신은 대한민국 외교부·KF·KOICA의 공공외교 및 ODA 사업 기획 전문가입니다.
아래 공공데이터를 근거로, 실무에 바로 쓸 수 있는 **사업계획서 초안**을 작성하세요.
모든 서술은 아래 제공된 데이터의 수치를 근거로 하고, 근거 없는 수치를 만들지 마세요.

{_country_data_block(country_id, meta)}

## ODA 사각지대 (지역 평균 섹터 비율 대비 실계산)
{_gaps_block(country_id)}

## 여행경보 (외교부 여행경보 API · data.go.kr)
- 현재 단계: {alarm_str}{africa_block}
{base_block}

## 출력 형식 — 아래 구조의 JSON 객체만 출력 (마크다운·설명 없이)
{PLAN_SCHEMA}

주의: activities 3~4건, kpis 3건 이상, risks 2건 이상. 반드시 JSON 객체만 출력.
서술형 필드(background, objectives, target_beneficiaries, activities.description, risks)에서
위 데이터의 수치를 인용할 때는 반드시 [[수치|출처]] 형식으로 감싸세요.
예: "[[339.9억원|KOICA 국가별 지원실적 CSV·data.go.kr]] 지원 중이나 [[수강생 0명|세종학당재단 통계]]으로..."
출처는 위 데이터 블록에 명시된 실제 출처만 사용하고, 데이터에 없는 수치는 절대 만들지 마세요."""

    client = _get_client()
    try:
        msg = client.messages.create(
            model=_MODEL,
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = _extract_json(msg.content[0].text)
        plan = json.loads(raw)
        if not isinstance(plan, dict):
            raise ValueError("JSON 객체가 아님")
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="AI 응답 파싱 실패 — 다시 시도해주세요.")
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail="AI 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=502, detail="계획서 생성에 실패했습니다. 잠시 후 다시 시도해주세요.")

    # 예산 금액이 숫자만 오는 경우 단위 보정
    for b in plan.get("budget_plan", []):
        amt = str(b.get("amount", "")).strip()
        if amt and not amt.endswith(("억원", "원", "달러", "USD")):
            b["amount"] = f"{amt}억원" if re.fullmatch(r"[\d,.]+", amt) else amt

    return {
        "country_id": country_id,
        "mode": "plan",
        "plan": plan,
        "model": _MODEL,
        "travel_alarm": alarm_str,
    }


def _generate_summary(country_id: str, meta: dict) -> dict:
    prompt = f"""당신은 대한민국 외교부·KOICA 공공외교 사업 기획 전문가입니다.
아래 국가 데이터를 바탕으로 사업기획 보고서용 **종합 전략 분석** (한국어, 3~4문장)을 작성하세요.
핵심 수치를 직접 인용하고, ODA와 공공외교 양축을 모두 언급하세요.
출력은 순수 텍스트만 (마크다운, 헤더, 기호 없이).

{_country_data_block(country_id, meta)}"""

    client = _get_client()
    try:
        msg = client.messages.create(
            model=_MODEL,
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        executive_summary = msg.content[0].text.strip()
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail="AI 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=502, detail="보고서 생성에 실패했습니다. 잠시 후 다시 시도해주세요.")

    return {"country_id": country_id, "mode": "summary", "executive_summary": executive_summary}


@router.post("/generate")
async def generate_report(req: ReportRequest):
    country_id = req.country_id
    meta = COUNTRY_META.get(country_id)
    if not meta:
        raise HTTPException(status_code=404, detail=f"Country not found: {country_id}")

    base_rec = _sanitize_base_rec(req.base_recommendation)
    base_title = (base_rec or {}).get("title", "")[:100]
    cache_key = f"{req.mode}:{country_id}:{base_title}:{','.join(sorted(req.sections))}"
    cached = _CACHE.get(cache_key)
    if cached and (time.time() - cached["ts"]) < _CACHE_TTL:
        return {**cached["data"], "cached": True}

    if req.mode == "plan":
        result = await _generate_plan(country_id, meta, base_rec)
    else:
        result = _generate_summary(country_id, meta)

    # 캐시 크기 상한 — 사용자 입력이 키에 포함되므로 무한 성장 방지
    if len(_CACHE) >= 256:
        oldest = min(_CACHE, key=lambda k: _CACHE[k]["ts"])
        _CACHE.pop(oldest, None)
    _CACHE[cache_key] = {"data": result, "ts": time.time()}
    return result
