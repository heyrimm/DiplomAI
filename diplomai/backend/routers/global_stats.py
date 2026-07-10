from fastapi import APIRouter
from data.country_meta import COUNTRY_META
from services.koica_csv import get_top_countries_with_totals, get_all_countries_ranked, get_country_latest
from services.public_diplomacy import _sejong_all
from services.kf_data import compute_kf_gap

router = APIRouter(prefix="/api/global", tags=["global"])

_GAPS_CACHE: dict | None = None


@router.get("/summary")
def global_summary():
    # KOICA 상위 10개국
    koica_top10 = get_top_countries_with_totals(10)

    # 세종학당 상위 10개국 (최신 연도 학습자 기준)
    sejong = _sejong_all()
    sejong_top10 = sorted(
        [{"name": k, "learners": v["latest"]} for k, v in sejong.items() if v["latest"] > 0],
        key=lambda x: x["learners"],
        reverse=True,
    )[:10]

    # 전 세계 한국어 학습자 합계
    total_learners = sum(v["latest"] for v in sejong.values() if v["latest"] > 0)

    # KOICA 실적 국가 수
    koica_country_count = len(get_all_countries_ranked(limit=200))

    return {
        "kpis": {
            "koica_countries": koica_country_count,
            "sejong_countries": len(sejong),
            "total_learners": total_learners,
        },
        "koica_top10": koica_top10,
        "sejong_top10": sejong_top10,
        "sources": {
            "koica": "KOICA 국가별 지원실적 (data.go.kr)",
            "sejong": "세종학당재단 국가별 수강생 현황 2025",
        },
    }


@router.get("/gaps")
def global_gaps():
    """전 국가 공공외교 공백 스캔 — ODA 지원 활발 + KF 사업 이력 부재/오래된 국가 목록."""
    global _GAPS_CACHE
    if _GAPS_CACHE is not None:
        return _GAPS_CACHE

    items = []
    for ko_name in COUNTRY_META:
        latest = get_country_latest(ko_name)
        oda_budget = latest["budget_억원"] if latest else 0
        gap = compute_kf_gap(ko_name, oda_budget)
        if gap:
            items.append({
                "country_id": ko_name,
                "region": COUNTRY_META[ko_name].get("region", ""),
                "oda_budget": oda_budget,
                "oda_year": latest.get("year") if latest else None,
                "kf_total": gap["kf_total"],
                "kf_last_year": gap["kf_last_year"],
                "reason": gap["reason"],
            })

    items.sort(key=lambda x: x["oda_budget"], reverse=True)
    _GAPS_CACHE = {
        "gaps": items,
        "total_detected": len(items),
        "criteria": "KOICA ODA 연 50억원 이상 지원 국가 중 KF 사업 이력이 없거나 최근 이력이 2017년 이전에만 확인되는 국가",
        "sources": [
            "KOICA 국가별 지원실적 (data.go.kr)",
            "KF 융합 공공외교·ODA 사업정보 (data.go.kr)",
        ],
    }
    return _GAPS_CACHE
