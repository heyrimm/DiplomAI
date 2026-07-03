from fastapi import APIRouter
from services.koica_csv import get_top_countries_with_totals, get_all_countries_ranked
from services.public_diplomacy import _sejong_all

router = APIRouter(prefix="/api/global", tags=["global"])


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
