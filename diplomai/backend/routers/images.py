"""이미지 프록시 라우터 — Unsplash 대표 이미지 검색 (키는 서버 보관)."""

from fastapi import APIRouter, Query

from services.unsplash import search_image, trigger_download

router = APIRouter(prefix="/api/image", tags=["image"])


@router.get("")
async def get_image(q: str = Query(..., min_length=1, max_length=80)):
    data = await search_image(q)
    if not data:
        return {}
    # 가이드라인 준수: 사용 시 download 트리거
    await trigger_download(data.get("download_location"))
    return {
        "url": data["url"],
        "alt": data["alt"],
        "author": data["author"],
        "author_url": data["author_url"],
    }
