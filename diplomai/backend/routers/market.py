"""
국가 시장정보 — World Bank 거시지표 + KOTRA 국가정보(진출·규제·생활) 융합.
사업가의 '현지 사업환경' 판단을 위한 지표·현지정보 종합 엔드포인트.
"""

from fastapi import APIRouter, HTTPException

from data.country_meta import COUNTRY_META
from services.worldbank import fetch_indicators
from services.kotra_api import fetch_nation_market, COUNTRY_ISO2_MAP

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/{country_id:path}")
async def get_market(country_id: str):
    meta = COUNTRY_META.get(country_id)
    if meta is None:
        raise HTTPException(status_code=404, detail=f"Country not found: {country_id}")

    iso2 = COUNTRY_ISO2_MAP.get(country_id)
    indicators = await fetch_indicators(iso2) if iso2 else []
    kotra = await fetch_nation_market(country_id)

    sources = []
    if indicators:
        sources.append("World Bank Open Data")
    if kotra:
        sources.append("KOTRA 국가정보 (data.go.kr)")

    return {
        "country_id": country_id,
        "iso2": iso2,
        "indicators": indicators,
        "trends": kotra["trends"] if kotra else {"gdp": [], "fx": [], "inflation": []},
        "korean_companies": kotra["korean_companies"] if kotra else [],
        "import_regulations": kotra["import_regulations"] if kotra else [],
        "industrial_complexes": kotra["industrial_complexes"] if kotra else [],
        "living": kotra["living"] if kotra else None,
        "offices": kotra["offices"] if kotra else [],
        "kotra_available": kotra is not None,
        "sources": sources,
    }
