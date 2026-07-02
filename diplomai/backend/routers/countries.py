from fastapi import APIRouter, HTTPException, Query
from data.country_meta import COUNTRY_META, search_meta
from services.koica_csv import search_countries_in_csv
from services.koica_indicators import get_country_indicators

router = APIRouter(prefix="/api/countries", tags=["countries"])

FEATURED_IDS = ["인도네시아", "베트남", "캄보디아", "에티오피아"]


def _build_country(ko_name: str) -> dict | None:
    meta = COUNTRY_META.get(ko_name)
    if meta is None:
        return None

    # 실제 CSV 데이터로 override (있을 때만)
    ind = get_country_indicators(ko_name) or {}

    def _pick(csv_key: str, meta_key: str, default=0):
        v = ind.get(csv_key)
        return v if (v is not None and v > 0) else meta.get(meta_key, default)

    return {
        "id":           ko_name,
        "name":         ko_name,
        "name_en":      meta.get("name_en", ""),
        "region":       meta.get("region", ""),
        "income_level": ind.get("income_level") or meta.get("income_level", ""),
        "population":   int(_pick("population", "population")),
        "gdp_per_capita": round(float(_pick("gdp_per_capita", "gdp_per_capita")), 1),
        "hdi":          _pick("hdi", "hdi"),
        # 추가 실데이터 필드
        "internet_usage":   ind.get("internet_usage"),
        "corruption_score": ind.get("corruption_score"),
        "gii":              ind.get("gii"),
    }


def _build_country_csv_only(ko_name: str) -> dict:
    """CSV에만 있는 국가 (country_meta 없음) — indicators만으로 구성."""
    ind = get_country_indicators(ko_name) or {}
    return {
        "id":             ko_name,
        "name":           ko_name,
        "name_en":        "",
        "region":         ind.get("region_en", ""),
        "income_level":   ind.get("income_level", ""),
        "population":     int(ind.get("population") or 0),
        "gdp_per_capita": float(ind.get("gdp_per_capita") or 0),
        "hdi":            ind.get("hdi") or 0,
        "internet_usage":   ind.get("internet_usage"),
        "corruption_score": ind.get("corruption_score"),
        "gii":              ind.get("gii"),
    }


@router.get("/")
def list_countries():
    return [c for c in (_build_country(k) for k in FEATURED_IDS) if c]


@router.get("/search")
def search_countries(q: str = Query("", description="국가명 검색어 (한국어)")):
    if not q.strip():
        return [c for c in (_build_country(k) for k in FEATURED_IDS) if c]

    meta_results = search_meta(q, limit=15)
    meta_names   = {r["name"] for r in meta_results}
    csv_names    = search_countries_in_csv(q, limit=10)
    extra_csv    = [n for n in csv_names if n not in meta_names]

    results = []
    for r in meta_results:
        c = _build_country(r["name"])
        if c:
            results.append(c)
    for ko in extra_csv:
        results.append(_build_country_csv_only(ko))

    return results[:15]


@router.get("/{country_id:path}")
def get_country(country_id: str):
    country = _build_country(country_id)
    if not country:
        # country_meta에 없어도 indicators CSV에 있으면 반환
        ind = get_country_indicators(country_id)
        if ind:
            return _build_country_csv_only(country_id)
        raise HTTPException(status_code=404, detail=f"Country not found: {country_id}")
    return country
