from fastapi import APIRouter, HTTPException
from data.country_meta import COUNTRY_META
from data.mock_data import PUBLIC_DIPLOMACY

router = APIRouter(prefix="/api/diplomacy", tags=["diplomacy"])

FEATURED_MAP = {
    "인도네시아": "indonesia",
    "베트남":     "vietnam",
    "캄보디아":   "cambodia",
    "에티오피아": "ethiopia",
}


@router.get("/{country_id:path}")
def get_diplomacy(country_id: str):
    if COUNTRY_META.get(country_id) is None:
        raise HTTPException(status_code=404, detail=f"Country not found: {country_id}")

    key = FEATURED_MAP.get(country_id)
    if key:
        return {"country_id": country_id, **PUBLIC_DIPLOMACY[key]}

    # 임의 국가: 기본 빈 구조 반환
    return {
        "country_id": country_id,
        "kf_index": None,
        "korean_learners": None,
        "tourists": None,
        "learners_yoy": None,
        "tourists_yoy": None,
        "rank_in_region": "데이터 없음",
        "channels": [],
        "trends": [],
        "timeline": [],
        "ai_insight": f"{country_id}에 대한 KF 공공외교 데이터가 아직 수집되지 않았습니다.",
    }
