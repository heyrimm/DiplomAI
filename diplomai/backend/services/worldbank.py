"""
World Bank Open API 클라이언트 (인증키 불필요)
- 국가별 핵심 거시지표(1인당 GDP PPP·실업률·인구·물류성과지수)를 조회.
- 출처: World Bank Open Data (api.worldbank.org) — ISO 3166-1 alpha-2 코드로 조회.
"""

import asyncio
import time

import httpx

_BASE = "https://api.worldbank.org/v2"

# (표시명, WB 지표코드, 단위, 종류)  종류: int / pct / float
_INDICATORS = [
    ("1인당 GDP(PPP)", "NY.GDP.PCAP.PP.CD", "USD", "int"),
    ("실업률",         "SL.UEM.TOTL.ZS",    "%",   "pct"),
    ("인구",           "SP.POP.TOTL",       "명",  "int"),
    ("물류성과지수",   "LP.LPI.OVRL.XQ",    "/5",  "float"),
]

_CACHE: dict[str, dict] = {}
_TTL = 24 * 3600


async def _one(client: httpx.AsyncClient, iso2: str, code: str) -> dict | None:
    # WB가 버스트 요청을 간헐적으로 튕기므로 짧게 재시도
    for attempt in range(3):
        try:
            r = await client.get(
                f"{_BASE}/country/{iso2}/indicator/{code}",
                params={"format": "json", "mrnev": "1", "per_page": "1"},
            )
            j = r.json()  # 에러 시 IIS가 XML을 주므로 여기서 예외 → 재시도
            row = j[1][0] if isinstance(j, list) and len(j) > 1 and j[1] else None
            if row and row.get("value") is not None:
                return {"value": row["value"], "year": row.get("date")}
            return None  # 정상 응답이나 값 없음 → 재시도 불필요
        except Exception:
            if attempt < 2:
                await asyncio.sleep(0.6)
    return None


async def fetch_indicators(iso2: str) -> list[dict]:
    """국가(ISO2)의 WB 핵심 지표 리스트. 값 없는 지표는 생략."""
    cached = _CACHE.get(iso2)
    if cached and (time.time() - cached["ts"]) < _TTL:
        return cached["data"]

    out: list[dict] = []
    try:
        # 동시 4요청은 WB rate-limit에 걸리므로 순차 호출
        async with httpx.AsyncClient(timeout=httpx.Timeout(20.0)) as client:
            for label, code, unit, kind in _INDICATORS:
                res = await _one(client, iso2, code)
                if res:
                    out.append({
                        "label": label, "value": res["value"], "unit": unit,
                        "year": res["year"], "kind": kind, "source": "World Bank",
                    })
    except Exception:
        return out

    if out:
        _CACHE[iso2] = {"data": out, "ts": time.time()}
    return out
