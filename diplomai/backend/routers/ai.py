from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from data.country_meta import COUNTRY_META
from data.mock_data import MOCK_RECOMMENDATIONS

router = APIRouter(prefix="/api/ai", tags=["ai"])

FEATURED_MAP = {
    "인도네시아": "indonesia",
    "베트남":     "vietnam",
    "캄보디아":   "cambodia",
    "에티오피아": "ethiopia",
}


class RecommendationRequest(BaseModel):
    country_id: str


@router.post("/recommend")
def get_recommendations(req: RecommendationRequest):
    country_id = req.country_id
    if COUNTRY_META.get(country_id) is None:
        raise HTTPException(status_code=404, detail=f"Country not found: {country_id}")

    key = FEATURED_MAP.get(country_id)
    if key and key in MOCK_RECOMMENDATIONS:
        recs = MOCK_RECOMMENDATIONS[key]
    else:
        recs = []

    return {
        "country_id": country_id,
        "country_name": country_id,
        "recommendations": recs,
    }
