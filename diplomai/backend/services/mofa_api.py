"""
외교부 공공데이터 API 클라이언트
- 여행경보: apis.data.go.kr/1262000/TravelAlarmService2/getTravelAlarmList2
- 안전공지: apis.data.go.kr/1262000/CountrySafetyService3/getCountrySafetyList3
출처: 공공데이터포털 (data.go.kr) — 외교부 제공
"""

import os
import httpx
from urllib.parse import quote

BASE_URL = "http://apis.data.go.kr"

COUNTRY_KO_MAP = {
    "indonesia": "인도네시아",
    "vietnam":   "베트남",
    "cambodia":  "캄보디아",
    "ethiopia":  "에티오피아",
}

ALARM_LEVEL_LABEL = {
    "1": "여행유의",
    "2": "여행자제",
    "3": "출국권고",
    "4": "여행금지",
}

ALARM_LEVEL_COLOR = {
    "1": "blue",
    "2": "yellow",
    "3": "orange",
    "4": "red",
}


def _get_key() -> str | None:
    return os.getenv("DATA_GO_KR_API_KEY")


async def fetch_travel_alarm(country_id: str) -> dict | None:
    """국가별 여행경보 단계 조회."""
    api_key = _get_key()
    if not api_key:
        return None

    country_ko = COUNTRY_KO_MAP.get(country_id)
    if not country_ko:
        return None

    url = f"{BASE_URL}/1262000/TravelAlarmService2/getTravelAlarmList2"
    params = {
        "serviceKey": api_key,
        "numOfRows": "100",
        "pageNo": "1",
        "type": "json",
    }

    try:
        timeout = httpx.Timeout(connect=4.0, read=8.0, write=4.0, pool=4.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

        items = (
            data.get("response", {})
                .get("body", {})
                .get("items", {})
                .get("item", [])
        )
        if isinstance(items, dict):
            items = [items]

        for item in items:
            country_name = item.get("country_nm") or item.get("countryNm") or ""
            if country_ko in country_name:
                level = str(item.get("alarm_lvl") or item.get("alarmLvl") or "")
                return {
                    "country_id": country_id,
                    "country_name": country_ko,
                    "level": level,
                    "level_label": ALARM_LEVEL_LABEL.get(level, "정보없음"),
                    "level_color": ALARM_LEVEL_COLOR.get(level, "gray"),
                    "remark": item.get("remark") or item.get("alarm_remark") or "",
                    "updated_at": item.get("written_dt") or item.get("writtenDt") or "",
                    "source": "외교부 여행경보 (data.go.kr)",
                }

        return {
            "country_id": country_id,
            "country_name": country_ko,
            "level": "0",
            "level_label": "경보없음",
            "level_color": "green",
            "remark": "",
            "updated_at": "",
            "source": "외교부 여행경보 (data.go.kr)",
        }

    except Exception:
        return None


async def fetch_safety_notices(country_id: str, limit: int = 3) -> list[dict] | None:
    """국가별 안전공지 최신 N건 조회."""
    api_key = _get_key()
    if not api_key:
        return None

    country_ko = COUNTRY_KO_MAP.get(country_id)
    if not country_ko:
        return None

    url = f"{BASE_URL}/1262000/CountrySafetyService3/getCountrySafetyList3"
    params = {
        "serviceKey": api_key,
        "numOfRows": "50",
        "pageNo": "1",
        "type": "json",
    }

    try:
        timeout = httpx.Timeout(connect=4.0, read=8.0, write=4.0, pool=4.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

        items = (
            data.get("response", {})
                .get("body", {})
                .get("items", {})
                .get("item", [])
        )
        if isinstance(items, dict):
            items = [items]

        notices = []
        for item in items:
            if country_ko not in (item.get("country_nm") or item.get("countryNm") or ""):
                continue
            notices.append({
                "title": item.get("title") or item.get("notice_title") or "",
                "date":  item.get("written_dt") or item.get("writtenDt") or "",
                "url":   item.get("origin_url") or item.get("originUrl") or "",
            })
            if len(notices) >= limit:
                break

        return notices if notices else None

    except Exception:
        return None
