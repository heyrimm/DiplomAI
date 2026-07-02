from fastapi import APIRouter, HTTPException
from data.country_meta import COUNTRY_META
from data.mock_data import REGIONAL_AVERAGES, PEER_COMPARISON
from services.koica_csv import get_country_history, get_country_latest, get_csv_metadata
from services.koica_indicators import (
    get_sector_breakdown,
    get_national_sector_weights,
    get_sdg_goals,
)

router = APIRouter(prefix="/api/oda", tags=["oda"])

GAP_THRESHOLD = 0.30

REGION_KEY_MAP = {
    "동남아시아": "southeast_asia",
    "남아시아":   "southeast_asia",
    "사하라이남 아프리카": "sub_saharan_africa",
}


def _get_meta(country_id: str) -> dict | None:
    return COUNTRY_META.get(country_id)


def _get_total(country_id: str) -> dict:
    latest = get_country_latest(country_id)
    return latest if latest else {"budget_억원": 0, "yoy_pct": None, "year": 2023}


def _build_sectors(country_id: str, real_total: float) -> list[dict]:
    """
    우선순위:
    1) 협력국 통합 개발 지표 CSV 섹터별 누적 비율 → 연간 총액 분배
    2) 전국 사업분야별 비중 → 연간 총액 분배
    """
    if real_total <= 0:
        return []

    # 1) 국가별 실제 비율
    sectors = get_sector_breakdown(country_id, real_total)
    if sectors:
        return sectors

    # 2) 전국 비율 fallback
    weights = get_national_sector_weights()
    return sorted(
        [
            {
                "sector":   s,
                "budget":   round(real_total * w, 1),
                "projects": max(1, round(real_total * w / 15)),
            }
            for s, w in weights.items()
            if real_total * w > 0
        ],
        key=lambda x: x["budget"],
        reverse=True,
    )


@router.get("/{country_id:path}/budget")
def get_oda_budget(country_id: str):
    meta = _get_meta(country_id)
    if meta is None:
        raise HTTPException(status_code=404, detail=f"Country not found: {country_id}")

    total     = _get_total(country_id)
    csv_meta  = get_csv_metadata()
    real_total = total["budget_억원"]
    sectors   = _build_sectors(country_id, real_total)

    # SDG 태그를 섹터별로 추가
    for s in sectors:
        s["sdg_goals"] = get_sdg_goals(s["sector"])

    return {
        "country_id":  country_id,
        "currency":    "억원",
        "year":        total.get("year", 2023),
        "total_억원":  real_total,
        "yoy_pct":     total.get("yoy_pct"),
        "sectors":     sectors,
        "source":      csv_meta["source"] if csv_meta["found"] else "KOICA 공개데이터",
        "sector_source": "KOICA 협력국 통합 개발 지표 (data.go.kr)",
    }


@router.get("/{country_id:path}/history")
def get_oda_history(country_id: str):
    meta = _get_meta(country_id)
    if meta is None:
        raise HTTPException(status_code=404, detail=f"Country not found: {country_id}")
    csv_meta = get_csv_metadata()
    history  = get_country_history(country_id)
    return {
        "country_id": country_id,
        "history":    history,
        "source":     csv_meta["source"] if csv_meta["found"] else "KOICA 공개데이터",
    }


@router.get("/{country_id:path}/gaps")
def get_oda_gaps(country_id: str):
    meta = _get_meta(country_id)
    if meta is None:
        raise HTTPException(status_code=404, detail=f"Country not found: {country_id}")

    region_ko  = meta.get("region", "")
    region_key = REGION_KEY_MAP.get(region_ko, "southeast_asia")
    avg        = REGIONAL_AVERAGES.get(region_key, REGIONAL_AVERAGES["southeast_asia"])

    total      = _get_total(country_id)
    real_total = total["budget_억원"]
    sectors    = _build_sectors(country_id, real_total)

    gaps = []
    for item in sectors:
        sector       = item["sector"]
        budget       = item["budget"]
        regional_avg = avg.get(sector, 0)
        if regional_avg > 0:
            ratio = budget / regional_avg
            if ratio < (1 - GAP_THRESHOLD):
                gaps.append({
                    "sector":          sector,
                    "current_budget":  budget,
                    "regional_average": regional_avg,
                    "ratio":           round(ratio, 2),
                    "gap_percent":     round((1 - ratio) * 100, 1),
                })

    return {
        "country_id":       country_id,
        "region":           region_key,
        "threshold_percent": GAP_THRESHOLD * 100,
        "gaps":             sorted(gaps, key=lambda x: x["ratio"]),
    }


@router.get("/{country_id:path}/peer-comparison")
def get_peer_comparison(country_id: str):
    meta = _get_meta(country_id)
    if meta is None:
        raise HTTPException(status_code=404, detail=f"Country not found: {country_id}")

    peer_key_map = {
        "인도네시아": "indonesia", "베트남": "vietnam",
        "캄보디아": "cambodia",   "에티오피아": "ethiopia",
    }
    peer_key = peer_key_map.get(country_id)
    if peer_key:
        return PEER_COMPARISON[peer_key]

    region_ko  = meta.get("region", "")
    region_key = REGION_KEY_MAP.get(region_ko, "southeast_asia")
    avg        = REGIONAL_AVERAGES.get(region_key, REGIONAL_AVERAGES["southeast_asia"])
    total      = _get_total(country_id)
    real_total = total["budget_억원"]
    weights    = get_national_sector_weights()
    top_sector, top_w = next(iter(weights.items()))
    return {
        "target": {"name": country_id, "code": "—"},
        "sector": top_sector,
        "peers":  [
            {"country": country_id,  "code": "—",   "pct": round(top_w * 100, 1), "level": "평균"},
            {"country": "지역 평균", "code": "AVG", "pct": round(avg.get(top_sector, 0) / max(real_total, 1) * 100, 1), "level": "평균"},
        ],
    }


@router.get("/csv/status")
def csv_status():
    return get_csv_metadata()
