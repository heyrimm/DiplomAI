"""
외교부 공공데이터 API 클라이언트
- 여행경보: apis.data.go.kr/1262000/TravelAlarmService2/getTravelAlarmList2
- 안전공지: apis.data.go.kr/1262000/CountrySafetyService3/getCountrySafetyList3
출처: 공공데이터포털 (data.go.kr) — 외교부 제공
"""

import os
import httpx

BASE_URL = "http://apis.data.go.kr"

# 한국어 국가명 → 외교부 API English name (country_eng_nm 필드 기준)
# 인코딩 문제로 country_nm 대신 country_eng_nm으로 매칭
COUNTRY_ENG_MAP: dict[str, str] = {
    "인도네시아":   "Indonesia",
    "베트남":       "Vietnam",
    "캄보디아":     "Cambodia",
    "에티오피아":   "Ethiopia",
    "필리핀":       "Philippines",
    "미얀마":       "Myanmar",
    "라오스":       "Laos",
    "태국":         "Thailand",
    "동티모르":     "Timor-Leste",
    "말레이시아":   "Malaysia",
    "몽골":         "Mongolia",
    "인도":         "India",
    "방글라데시":   "Bangladesh",
    "네팔":         "Nepal",
    "스리랑카":     "Sri Lanka",
    "파키스탄":     "Pakistan",
    "아프가니스탄": "Afghanistan",
    "우즈베키스탄": "Uzbekistan",
    "카자흐스탄":   "Kazakhstan",
    "키르기스스탄": "Kyrgyzstan",
    "타지키스탄":   "Tajikistan",
    "아제르바이잔": "Azerbaijan",
    "조지아":       "Georgia",
    "아르메니아":   "Armenia",
    "우크라이나":   "Ukraine",
    "케냐":         "Kenya",
    "탄자니아":     "Tanzania",
    "르완다":       "Rwanda",
    "우간다":       "Uganda",
    "가나":         "Ghana",
    "세네갈":       "Senegal",
    "모잠비크":     "Mozambique",
    "마다가스카르": "Madagascar",
    "나이지리아":   "Nigeria",
    "잠비아":       "Zambia",
    "남수단":       "South Sudan",
    "짐바브웨":     "Zimbabwe",
    "수단":         "Sudan",
    "이집트":       "Egypt",
    "팔레스타인":   "Palestine",
    "모로코":       "Morocco",
    "요르단":       "Jordan",
    "이라크":       "Iraq",
    "튀니지":       "Tunisia",
    "에콰도르":     "Ecuador",
    "볼리비아":     "Bolivia",
    "페루":         "Peru",
    "콜롬비아":     "Colombia",
    "과테말라":     "Guatemala",
    "온두라스":     "Honduras",
    "니카라과":     "Nicaragua",
    "파라과이":     "Paraguay",
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

_ALARM_CACHE: dict[str, list] = {}


def _get_key() -> str | None:
    return os.getenv("DATA_GO_KR_API_KEY")


async def _fetch_all_alarms() -> list[dict]:
    """전체 여행경보 목록 1회 캐시 조회."""
    if _ALARM_CACHE.get("items"):
        return _ALARM_CACHE["items"]

    api_key = _get_key()
    if not api_key:
        return []

    url = f"{BASE_URL}/1262000/TravelAlarmService2/getTravelAlarmList2"
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
            resp = await client.get(url, params={
                "serviceKey": api_key,
                "numOfRows": "300",
                "pageNo": "1",
                "type": "json",
            })
            resp.raise_for_status()
            data = resp.json()
        items = (
            data.get("response", {}).get("body", {})
                .get("items", {}).get("item", [])
        )
        if isinstance(items, dict):
            items = [items]
        _ALARM_CACHE["items"] = items
        return items
    except Exception:
        return []


async def fetch_travel_alarm(country_id: str) -> dict | None:
    """국가별 여행경보 단계 조회 (한국어 국가명 = country_id)."""
    api_key = _get_key()
    if not api_key:
        return None

    # 한국어 이름 → 영어 이름으로 매칭 (인코딩 문제 우회)
    eng_name = COUNTRY_ENG_MAP.get(country_id)
    if not eng_name:
        return None

    items = await _fetch_all_alarms()

    for item in items:
        item_eng = (item.get("country_eng_nm") or "").strip()
        if item_eng.lower() == eng_name.lower():
            level = str(item.get("alarm_lvl") or "")
            return {
                "country_id": country_id,
                "country_name": country_id,
                "level": level,
                "level_label": ALARM_LEVEL_LABEL.get(level, "정보없음"),
                "level_color": ALARM_LEVEL_COLOR.get(level, "gray"),
                "remark": "",
                "updated_at": item.get("written_dt") or "",
                "source": "외교부 여행경보 (data.go.kr)",
            }

    # 경보 없음 (목록에 없으면 정상 국가)
    return {
        "country_id": country_id,
        "country_name": country_id,
        "level": "0",
        "level_label": "경보없음",
        "level_color": "green",
        "remark": "",
        "updated_at": "",
        "source": "외교부 여행경보 (data.go.kr)",
    }


async def fetch_safety_notices(country_id: str, limit: int = 3) -> list[dict] | None:
    """국가별 안전공지 최신 N건 조회."""
    api_key = _get_key()
    if not api_key:
        return None

    eng_name = COUNTRY_ENG_MAP.get(country_id)
    if not eng_name:
        return None

    url = f"{BASE_URL}/1262000/CountrySafetyService3/getCountrySafetyList3"
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
            resp = await client.get(url, params={
                "serviceKey": api_key,
                "numOfRows": "100",
                "pageNo": "1",
                "type": "json",
            })
            resp.raise_for_status()
            data = resp.json()
        items = (
            data.get("response", {}).get("body", {})
                .get("items", {}).get("item", [])
        )
        if isinstance(items, dict):
            items = [items]

        notices = []
        for item in items:
            item_eng = (item.get("country_eng_nm") or "").strip()
            if item_eng.lower() != eng_name.lower():
                continue
            notices.append({
                "title": item.get("title") or item.get("notice_title") or "",
                "date":  item.get("written_dt") or item.get("writtenDt") or "",
                "url":   item.get("origin_url") or item.get("originUrl") or "",
            })
            if len(notices) >= limit:
                break

        return notices if notices else []
    except Exception:
        return None
