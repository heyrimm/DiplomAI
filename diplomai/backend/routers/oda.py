from fastapi import APIRouter, HTTPException
from data.country_meta import COUNTRY_META
from data.mock_data import (
    ODA_BUDGETS,
    REGIONAL_AVERAGES,
    PEER_COMPARISON,
)
from services.koica_csv import get_country_history, get_country_latest, get_csv_metadata

router = APIRouter(prefix="/api/oda", tags=["oda"])

GAP_THRESHOLD = 0.30

# 기본 4개국 섹터 비율 mock (총액은 CSV 실제값으로 스케일)
FEATURED_MOCK_SECTORS = {
    "인도네시아": ODA_BUDGETS["indonesia"],
    "베트남":     ODA_BUDGETS["vietnam"],
    "캄보디아":   ODA_BUDGETS["cambodia"],
    "에티오피아": ODA_BUDGETS["ethiopia"],
}

# 기본 지역 평균 (gap 분석용)
REGION_KEY_MAP = {
    "동남아시아": "southeast_asia",
    "남아시아":   "southeast_asia",
    "사하라이남 아프리카": "sub_saharan_africa",
}

# 기본 섹터 분포 (임의 국가용 — 지역 평균을 기준으로 균등 배분)
DEFAULT_SECTORS = ["교육", "보건", "농업·농촌개발", "환경", "거버넌스", "산업·에너지", "젠더", "물·위생"]
DEFAULT_SECTOR_WEIGHTS = [0.20, 0.18, 0.20, 0.08, 0.12, 0.12, 0.05, 0.05]


def _get_meta(country_id: str) -> dict | None:
    return COUNTRY_META.get(country_id)


def _get_total(country_id: str) -> dict:
    latest = get_country_latest(country_id)
    if latest:
        return latest
    return {"budget_억원": 0, "yoy_pct": None, "year": 2023}


@router.get("/{country_id:path}/budget")
def get_oda_budget(country_id: str):
    meta = _get_meta(country_id)
    if meta is None:
        raise HTTPException(status_code=404, detail=f"Country not found: {country_id}")

    total = _get_total(country_id)
    csv_meta = get_csv_metadata()
    real_total = total["budget_억원"]

    mock_sectors = FEATURED_MOCK_SECTORS.get(country_id)
    if mock_sectors:
        mock_total = sum(s["budget"] for s in mock_sectors)
        if mock_total > 0 and real_total > 0:
            scale = real_total / mock_total
            sectors = [
                {"sector": s["sector"], "budget": round(s["budget"] * scale, 1), "projects": s["projects"]}
                for s in mock_sectors
            ]
        else:
            sectors = mock_sectors
    else:
        # 임의 국가: 실제 총액을 기본 비율로 분배
        if real_total > 0:
            sectors = [
                {"sector": s, "budget": round(real_total * w, 1), "projects": max(1, round(real_total * w / 20))}
                for s, w in zip(DEFAULT_SECTORS, DEFAULT_SECTOR_WEIGHTS)
            ]
        else:
            sectors = []

    return {
        "country_id": country_id,
        "currency": "억원",
        "year": total.get("year", 2023),
        "total_억원": real_total,
        "yoy_pct": total.get("yoy_pct"),
        "sectors": sectors,
        "source": csv_meta["source"] if csv_meta["found"] else "mock",
    }


@router.get("/{country_id:path}/history")
def get_oda_history(country_id: str):
    """KOICA 연도별 지원 실적 (2010~)."""
    meta = _get_meta(country_id)
    if meta is None:
        raise HTTPException(status_code=404, detail=f"Country not found: {country_id}")
    csv_meta = get_csv_metadata()
    history = get_country_history(country_id)
    return {
        "country_id": country_id,
        "history": history,
        "source": csv_meta["source"] if csv_meta["found"] else "mock",
    }


@router.get("/{country_id:path}/gaps")
def get_oda_gaps(country_id: str):
    meta = _get_meta(country_id)
    if meta is None:
        raise HTTPException(status_code=404, detail=f"Country not found: {country_id}")

    region_ko = meta.get("region", "")
    region_key = REGION_KEY_MAP.get(region_ko, "southeast_asia")
    avg = REGIONAL_AVERAGES.get(region_key, REGIONAL_AVERAGES["southeast_asia"])

    mock_sectors = FEATURED_MOCK_SECTORS.get(country_id)
    if not mock_sectors:
        # 임의 국가: budget 엔드포인트와 동일한 기본 분배
        total = _get_total(country_id)
        real_total = total["budget_억원"]
        mock_sectors = [
            {"sector": s, "budget": round(real_total * w, 1)}
            for s, w in zip(DEFAULT_SECTORS, DEFAULT_SECTOR_WEIGHTS)
        ] if real_total > 0 else []

    gaps = []
    for item in mock_sectors:
        sector = item["sector"]
        budget = item["budget"]
        regional_avg = avg.get(sector, 0)
        if regional_avg > 0:
            ratio = budget / regional_avg
            if ratio < (1 - GAP_THRESHOLD):
                gaps.append({
                    "sector": sector,
                    "current_budget": budget,
                    "regional_average": regional_avg,
                    "ratio": round(ratio, 2),
                    "gap_percent": round((1 - ratio) * 100, 1),
                })

    return {
        "country_id": country_id,
        "region": region_key,
        "threshold_percent": GAP_THRESHOLD * 100,
        "gaps": sorted(gaps, key=lambda x: x["ratio"]),
    }


@router.get("/{country_id:path}/peer-comparison")
def get_peer_comparison(country_id: str):
    meta = _get_meta(country_id)
    if meta is None:
        raise HTTPException(status_code=404, detail=f"Country not found: {country_id}")
    # 기본 4개국만 상세 peer 데이터 보유
    peer_key_map = {"인도네시아": "indonesia", "베트남": "vietnam", "캄보디아": "cambodia", "에티오피아": "ethiopia"}
    peer_key = peer_key_map.get(country_id)
    if peer_key:
        return PEER_COMPARISON[peer_key]
    # 임의 국가: 해당 지역 평균과 비교
    region_ko = meta.get("region", "")
    region_key = REGION_KEY_MAP.get(region_ko, "southeast_asia")
    avg = REGIONAL_AVERAGES.get(region_key, REGIONAL_AVERAGES["southeast_asia"])
    total = _get_total(country_id)
    real_total = total["budget_억원"]
    top_sector = max(zip(DEFAULT_SECTORS, DEFAULT_SECTOR_WEIGHTS), key=lambda x: x[1])
    return {
        "target": {"name": country_id, "code": "—"},
        "sector": top_sector[0],
        "peers": [
            {"country": country_id, "code": "—", "pct": round(top_sector[1] * 100, 1), "level": "평균"},
            {"country": "지역 평균", "code": "AVG", "pct": round(avg.get(top_sector[0], 0) / max(real_total, 1) * 100, 1), "level": "평균"},
        ],
    }


@router.get("/csv/status")
def csv_status():
    return get_csv_metadata()
