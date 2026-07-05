from fastapi import APIRouter, HTTPException
from data.country_meta import COUNTRY_META
from services.koica_csv import get_country_history, get_country_latest, get_csv_metadata
from services.koica_indicators import (
    get_sector_breakdown,
    get_national_sector_weights,
    get_sdg_goals,
    get_regional_sector_proportions,
    get_sector_proportions,
)

router = APIRouter(prefix="/api/oda", tags=["oda"])

GAP_THRESHOLD = 0.30


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
    total      = _get_total(country_id)
    real_total = total["budget_억원"]
    sectors    = _build_sectors(country_id, real_total)

    if real_total <= 0 or not sectors:
        return {
            "country_id":        country_id,
            "region":            region_ko,
            "threshold_percent": GAP_THRESHOLD * 100,
            "gaps":              [],
        }

    # KOICA CSV 실데이터 기반 지역 평균 섹터 비율로 비율 비교
    regional_props = get_regional_sector_proportions(region_ko)
    country_total  = sum(s["budget"] for s in sectors) or 1.0

    gaps = []
    for item in sectors:
        sector      = item["sector"]
        country_pct = item["budget"] / country_total
        reg_pct     = regional_props.get(sector, 0)
        if reg_pct <= 0:
            continue
        ratio = country_pct / reg_pct
        if ratio < (1 - GAP_THRESHOLD):
            gaps.append({
                "sector":           sector,
                "current_budget":   round(item["budget"], 1),
                "regional_average": round(reg_pct * real_total, 1),
                "ratio":            round(ratio, 2),
                "gap_percent":      round((1 - ratio) * 100, 1),
            })

    return {
        "country_id":        country_id,
        "region":            region_ko,
        "threshold_percent": GAP_THRESHOLD * 100,
        "gaps":              sorted(gaps, key=lambda x: x["ratio"]),
    }


@router.get("/{country_id:path}/peer-comparison")
def get_peer_comparison(country_id: str):
    meta = _get_meta(country_id)
    if meta is None:
        raise HTTPException(status_code=404, detail=f"Country not found: {country_id}")

    region_ko = meta.get("region", "")

    # 지역 내 국가별 섹터 비율 수집 (KOICA CSV 실데이터)
    peer_props: dict[str, dict[str, float]] = {}
    for ko_name, m in COUNTRY_META.items():
        if m.get("region") != region_ko:
            continue
        props = get_sector_proportions(ko_name)
        if props:
            peer_props[ko_name] = props

    target_props = peer_props.get(country_id)
    if not target_props or len(peer_props) < 3:
        return {
            "target": {"name": country_id, "code": "—"},
            "sector": "데이터 부족",
            "peers":  [],
        }

    # 지역 평균 섹터 비율
    all_sectors: set[str] = set()
    for p in peer_props.values():
        all_sectors.update(p.keys())
    n = len(peer_props)
    regional_avg = {s: sum(p.get(s, 0) for p in peer_props.values()) / n for s in all_sectors}

    # 대상 국가에서 지역 평균과 가장 차이 나는 섹터 (focus 섹터)
    focus_sector = max(
        (s for s in target_props if s in regional_avg),
        key=lambda s: abs(target_props.get(s, 0) - regional_avg[s]),
        default=next(iter(target_props)),
    )

    avg_pct = round(regional_avg[focus_sector] * 100, 1)

    # 지역 내 최대 4개 국가 + 대상 국가 포함 보장
    ranked = sorted(
        [(name, round(p.get(focus_sector, 0) * 100, 1)) for name, p in peer_props.items()],
        key=lambda x: x[1], reverse=True,
    )
    peers_out: list[dict] = []
    included_target = False
    for name, pct in ranked:
        if name == country_id:
            included_target = True
        elif len(peers_out) >= 4:
            continue
        level = "높음" if pct > avg_pct * 1.2 else ("낮음" if pct < avg_pct * 0.8 else "평균")
        code  = "★" if name == country_id else COUNTRY_META.get(name, {}).get("name_en", name)[:3].upper()
        peers_out.append({"country": name, "code": code, "pct": pct, "level": level})
    if not included_target:
        tpct  = round(target_props.get(focus_sector, 0) * 100, 1)
        level = "높음" if tpct > avg_pct * 1.2 else ("낮음" if tpct < avg_pct * 0.8 else "평균")
        peers_out.append({"country": country_id, "code": "★", "pct": tpct, "level": level})
    peers_out.append({"country": "지역 평균", "code": "AVG", "pct": avg_pct, "level": "평균"})

    return {
        "target": {"name": country_id, "code": meta.get("name_en", country_id)[:3].upper()},
        "sector": focus_sector,
        "peers":  peers_out,
    }


@router.get("/csv/status")
def csv_status():
    return get_csv_metadata()
