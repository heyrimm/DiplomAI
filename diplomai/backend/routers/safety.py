"""
외교부 여행경보 · 안전공지 라우터
출처: 공공데이터포털 외교부 API (data.go.kr)
"""

import json
import logging
import os
import re
import time

import anthropic
from fastapi import APIRouter, HTTPException
from services.mofa_api import fetch_travel_alarm, fetch_safety_notices, fetch_alarm_history, _fetch_all_alarms
from data.country_meta import COUNTRY_META

router = APIRouter(prefix="/api/safety", tags=["safety"])

# 여행경보 이력 AI 요약 캐시 — 이력 데이터는 거의 변하지 않음
_HIST_SUMMARY_CACHE: dict[str, dict] = {}
_HIST_SUMMARY_TTL = 86400


def _summarize_history(country_id: str, history: list[dict]) -> list[dict]:
    """Claude로 이력 원문을 완결된 한 문장으로 요약. 키 미설정·실패 시 원문 유지."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not history or not api_key or api_key.startswith("your_"):
        return history

    cached = _HIST_SUMMARY_CACHE.get(country_id)
    if cached and time.time() - cached["ts"] < _HIST_SUMMARY_TTL:
        return cached["data"]

    numbered = "\n".join(f"{i + 1}. [{h['title']}] {h['summary']}" for i, h in enumerate(history))
    prompt = (
        "다음은 외교부 여행경보 조정 공지 원문 발췌입니다. 각 항목을 핵심(대상 지역, 조정 내용, 사유)만 담아 "
        "완결된 한 문장(90자 이내, '~함/~됨' 개조식)으로 요약하세요. 문장을 중간에 끊지 마세요.\n\n"
        f"{numbered}\n\n"
        f"JSON 문자열 배열만 출력하세요. 항목 수는 정확히 {len(history)}개."
    )
    try:
        client = anthropic.Anthropic(api_key=api_key)
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:].strip()
        if not raw.startswith("["):
            m = re.search(r"\[.*\]", raw, re.DOTALL)
            raw = m.group(0) if m else raw
        summaries = json.loads(raw)
        if isinstance(summaries, list) and len(summaries) == len(history):
            history = [
                {**h, "summary": s.strip()} if isinstance(s, str) and s.strip() else h
                for h, s in zip(history, summaries)
            ]
            _HIST_SUMMARY_CACHE[country_id] = {"data": history, "ts": time.time()}
    except Exception as e:
        logging.warning("alarm-history AI 요약 실패, 원문 표시: %s", e)
    return history

_MOCK_ALARM = {
    "인도네시아": {"level": "1", "level_label": "여행유의", "level_color": "blue",   "remark": ""},
    "베트남":     {"level": "1", "level_label": "여행유의", "level_color": "blue",   "remark": ""},
    "캄보디아":   {"level": "2", "level_label": "여행자제", "level_color": "yellow", "remark": ""},
    "에티오피아": {"level": "2", "level_label": "여행자제", "level_color": "yellow", "remark": ""},
}


@router.get("/overview")
async def get_alarm_overview():
    """외교부 여행경보 전체 현황 — 단계별 국가 목록."""
    items = await _fetch_all_alarms()

    grouped: dict[str, list] = {"4": [], "3": [], "2": [], "1": []}
    for item in items:
        level = str(item.get("alarm_lvl") or "")
        if level not in grouped:
            continue
        grouped[level].append({
            "country_eng": item.get("country_eng_nm", ""),
            "country_iso": item.get("country_iso_alp2", ""),
        })

    label_map = {"4": "여행금지", "3": "출국권고", "2": "여행자제", "1": "여행유의"}
    color_map = {"4": "red", "3": "orange", "2": "yellow", "1": "blue"}

    levels = [
        {
            "level": lv,
            "label": label_map[lv],
            "color": color_map[lv],
            "count": len(grouped[lv]),
            "countries": sorted(grouped[lv], key=lambda x: x["country_eng"]),
        }
        for lv in ["4", "3", "2", "1"]
    ]

    return {
        "levels": levels,
        "total_countries": sum(len(v) for v in grouped.values()),
        "source": "외교부 여행경보 (data.go.kr)",
    }


@router.get("/{country_id:path}/alarm")
async def get_travel_alarm(country_id: str):
    if COUNTRY_META.get(country_id) is None:
        raise HTTPException(status_code=404, detail=f"Country not found: {country_id}")

    result = await fetch_travel_alarm(country_id)
    if result:
        return result

    mock = _MOCK_ALARM.get(country_id, {"level": "0", "level_label": "정보 없음", "level_color": "gray", "remark": ""})
    return {
        "country_id": country_id,
        "country_name": country_id,
        "source": "mock (API 키 미설정 또는 연결 실패)",
        **mock,
    }


@router.get("/{country_id:path}/notices")
async def get_safety_notices(country_id: str):
    if COUNTRY_META.get(country_id) is None:
        raise HTTPException(status_code=404, detail=f"Country not found: {country_id}")

    result = await fetch_safety_notices(country_id)
    if result is not None:
        return {"country_id": country_id, "notices": result, "source": "외교부 (data.go.kr)"}

    return {
        "country_id": country_id,
        "notices": [],
        "source": "mock (API 키 미설정 또는 연결 실패)",
    }


@router.get("/{country_id:path}/alarm-history")
async def get_alarm_history(country_id: str):
    """여행경보 조정 이력 (CountryHistoryService2)."""
    if COUNTRY_META.get(country_id) is None:
        raise HTTPException(status_code=404, detail=f"Country not found: {country_id}")

    result = await fetch_alarm_history(country_id)
    return {
        "country_id": country_id,
        "history": _summarize_history(country_id, result or []),
        "source": "외교부 여행경보 조정 이력 (data.go.kr)",
    }
