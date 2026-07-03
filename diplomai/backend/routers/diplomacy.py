import math
from fastapi import APIRouter, HTTPException
from data.country_meta import COUNTRY_META
from services.public_diplomacy import (
    get_sejong,
    get_diaspora,
    get_embassy_count,
    compute_diplomacy_index,
)

router = APIRouter(prefix="/api/diplomacy", tags=["diplomacy"])


@router.get("/{country_id:path}")
async def get_diplomacy(country_id: str):
    meta = COUNTRY_META.get(country_id)
    if meta is None:
        raise HTTPException(status_code=404, detail=f"Country not found: {country_id}")

    name_en: str = meta.get("name_en", "")
    region: str = meta.get("region", "")

    sejong = get_sejong(country_id)
    diaspora = get_diaspora(country_id)
    embassy = await get_embassy_count(name_en)

    learners: int | None = sejong["latest"] if sejong else None
    learners_yoy: float | None = sejong["yoy"] if sejong else None
    diaspora_count: int | None = diaspora
    embassy_count: int | None = embassy

    # 공공외교 지수 산출
    index: int | None = None
    if learners is not None or diaspora_count is not None:
        index = compute_diplomacy_index(
            learners or 0,
            diaspora_count or 0,
            embassy_count or 0,
        )

    # 세종학당 연도별 추이
    sejong_history = None
    if sejong:
        sejong_history = [
            {"year": y.replace("년", ""), "count": c}
            for y, c in sejong["history"].items()
        ]

    # 채널별 현황 (실데이터 기반)
    channels = []
    if learners is not None and learners > 0:
        score = min(math.log10(learners + 1) / math.log10(50_000) * 100, 100)
        channels.append({"label": "세종학당 수강생", "score": round(score, 1)})
    if diaspora_count is not None and diaspora_count > 0:
        score = min(math.log10(diaspora_count + 1) / math.log10(3_000_000) * 100, 100)
        channels.append({"label": "재외동포 네트워크", "score": round(score, 1)})
    if embassy_count is not None and embassy_count > 0:
        score = min(embassy_count / 5 * 100, 100)
        channels.append({"label": "외교공관 네트워크", "score": round(score, 1)})

    # 추이
    trends = []
    if learners_yoy is not None:
        sign = "+" if learners_yoy >= 0 else ""
        trends.append({"label": "세종학당 수강생 증감", "value": f"{sign}{learners_yoy}%"})

    # AI 인사이트 (규칙 기반)
    parts = []
    if learners is not None:
        parts.append(f"세종학당 수강생 {learners:,}명")
    if diaspora_count is not None:
        parts.append(f"재외동포 {diaspora_count:,}명")
    if embassy_count is not None:
        parts.append(f"재외공관 {embassy_count}개소")

    if parts and index is not None:
        ai_insight = (
            f"{country_id}의 공공외교 지수는 {index}/100입니다. "
            f"({', '.join(parts)} 기반 산출)"
        )
    elif parts:
        ai_insight = f"{country_id}: {', '.join(parts)}"
    else:
        ai_insight = f"{country_id}에 대한 공공외교 데이터를 수집 중입니다."

    return {
        "country_id": country_id,
        "kf_index": index,
        "korean_learners": learners,
        "learners_yoy": learners_yoy,
        "diaspora_count": diaspora_count,
        "embassy_count": embassy_count,
        "sejong_history": sejong_history,
        "tourists": None,
        "tourists_yoy": None,
        "rank_in_region": f"{region} · 공공외교 지수 기반",
        "channels": channels,
        "trends": trends,
        "timeline": [],
        "ai_insight": ai_insight,
        "data_sources": [
            "세종학당재단 국가별 수강생 현황 (2025)",
            "외교부 재외동포현황 (2021)",
            "data.go.kr 재외공관 정보 API",
        ],
    }
