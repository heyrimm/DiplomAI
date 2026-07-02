from fastapi import APIRouter, HTTPException, Query
from data.country_meta import COUNTRY_META, search_meta
from services.koica_csv import search_countries_in_csv

router = APIRouter(prefix="/api/countries", tags=["countries"])

# 대회 기본 4개국 (featured)
FEATURED_IDS = ["인도네시아", "베트남", "캄보디아", "에티오피아"]


def _build_country(ko_name: str) -> dict:
    meta = COUNTRY_META.get(ko_name)
    if meta is None:
        return None
    return {
        "id": ko_name,  # id는 한국어 이름 (URL 인코딩됨)
        "name": ko_name,
        "name_en": meta.get("name_en", ""),
        "region": meta.get("region", ""),
        "income_level": meta.get("income_level", ""),
        "population": meta.get("population", 0),
        "gdp_per_capita": meta.get("gdp_per_capita", 0),
        "hdi": meta.get("hdi", 0),
    }


@router.get("/")
def list_countries():
    """대회 기본 4개국 반환."""
    return [c for c in (_build_country(k) for k in FEATURED_IDS) if c]


@router.get("/search")
def search_countries(q: str = Query("", description="국가명 검색어 (한국어)")):
    """
    KOICA 실적 국가 + 메타데이터 기반 국가 검색.
    q가 비어있으면 추천 국가 목록 반환.
    """
    if not q.strip():
        return [c for c in (_build_country(k) for k in FEATURED_IDS) if c]

    # 1) 메타데이터 검색 (한국어 + 영어)
    meta_results = search_meta(q, limit=15)

    # 2) CSV에서 추가 검색 (메타데이터에 없는 국가 보완)
    meta_names = {r["name"] for r in meta_results}
    csv_names = search_countries_in_csv(q, limit=10)
    extra_csv = [n for n in csv_names if n not in meta_names]

    results = []
    for r in meta_results:
        results.append({
            "id": r["name"],
            "name": r["name"],
            "name_en": r.get("name_en", ""),
            "region": r.get("region", ""),
            "income_level": r.get("income_level", ""),
            "population": r.get("population", 0),
            "gdp_per_capita": r.get("gdp_per_capita", 0),
            "hdi": r.get("hdi", 0),
        })

    # CSV에만 있는 국가는 기본 정보만
    for ko in extra_csv:
        results.append({
            "id": ko,
            "name": ko,
            "name_en": "",
            "region": "",
            "income_level": "",
            "population": 0,
            "gdp_per_capita": 0,
            "hdi": 0,
        })

    return results[:15]


@router.get("/{country_id:path}")
def get_country(country_id: str):
    """국가 상세 정보 반환. country_id는 한국어 국가명."""
    country = _build_country(country_id)
    if not country:
        raise HTTPException(status_code=404, detail=f"Country not found: {country_id}")
    return country
