"""
Unsplash 이미지 검색 프록시.
- 키(UNSPLASH_ACCESS_KEY)는 서버에만 보관, 클라이언트로 노출하지 않음
- 검색어별 메모리 캐시 (TTL 24h) — Demo 티어(시간당 50) 절약
- Unsplash 가이드라인: 촬영자 크레딧 반환 + download 트리거
"""

import os
import time

import httpx

_CACHE: dict[str, dict] = {}
_CACHE_TTL = 86400  # 24h

_ENDPOINT = "https://api.unsplash.com/search/photos"


def _key() -> str | None:
    k = os.getenv("UNSPLASH_ACCESS_KEY")
    return k if k and not k.startswith("your_") else None


async def search_image(query: str) -> dict | None:
    """검색어에 맞는 대표 이미지 1건 반환 (url·크레딧). 실패 시 None."""
    key = _key()
    if not key or not query.strip():
        return None

    cached = _CACHE.get(query)
    if cached and (time.time() - cached["ts"]) < _CACHE_TTL:
        return cached["data"]

    data = None
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(8.0)) as client:
            r = await client.get(
                _ENDPOINT,
                params={
                    "query": query,
                    "per_page": 1,
                    "orientation": "squarish",
                    "content_filter": "high",
                },
                headers={"Authorization": f"Client-ID {key}"},
            )
            r.raise_for_status()
            results = r.json().get("results", [])
            if results:
                p = results[0]
                data = {
                    "url": p["urls"]["small"],
                    "alt": p.get("alt_description") or query,
                    "author": p["user"]["name"],
                    "author_url": p["user"]["links"]["html"] + "?utm_source=DiplomAI&utm_medium=referral",
                    "download_location": p["links"]["download_location"],
                }
    except Exception:
        data = None

    # None도 캐시 (반복 실패 시 호출 절약)
    _CACHE[query] = {"data": data, "ts": time.time()}
    return data


async def trigger_download(download_location: str | None) -> None:
    """Unsplash API 가이드라인: 이미지 사용 시 download endpoint 호출."""
    key = _key()
    if not key or not download_location:
        return
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(6.0)) as client:
            await client.get(download_location, headers={"Authorization": f"Client-ID {key}"})
    except Exception:
        pass
