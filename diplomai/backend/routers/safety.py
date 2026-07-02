"""
외교부 여행경보 · 안전공지 라우터
출처: 공공데이터포털 외교부 API (data.go.kr)
"""

from fastapi import APIRouter, HTTPException
from services.mofa_api import fetch_travel_alarm, fetch_safety_notices, _fetch_all_alarms
from data.country_meta import COUNTRY_META

router = APIRouter(prefix="/api/safety", tags=["safety"])

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
