import math
from fastapi import APIRouter, HTTPException
from data.country_meta import COUNTRY_META
from services.public_diplomacy import (
    get_sejong,
    get_diaspora,
    get_embassy_count,
    compute_diplomacy_index,
)
from services.kf_data import get_kf_projects, get_korean_studies, get_africa_exchanges
from services.koica_csv import get_country_latest

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
    kf_projects = get_kf_projects(country_id)
    korean_studies = get_korean_studies(country_id)
    africa_exchanges = get_africa_exchanges(country_id) if "아프리카" in region else None

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
    if korean_studies and korean_studies["universities"] > 0:
        score = min(math.log10(korean_studies["universities"] + 1) / math.log10(200) * 100, 100)
        channels.append({"label": "한국학 운영 대학", "score": round(score, 1)})
    if kf_projects and kf_projects["total"] > 0:
        score = min(math.log10(kf_projects["total"] + 1) / math.log10(3_000) * 100, 100)
        channels.append({"label": "KF 공공외교 사업", "score": round(score, 1)})

    # 추이
    trends = []
    if learners_yoy is not None:
        sign = "+" if learners_yoy >= 0 else ""
        trends.append({"label": "세종학당 수강생 증감", "value": f"{sign}{learners_yoy}%"})

    # 공공외교 공백 신호: ODA 지원은 활발한데 KF 공공외교 사업이 없거나 오래 끊긴 경우
    kf_gap = None
    latest_oda = get_country_latest(country_id)
    oda_budget = latest_oda["budget_억원"] if latest_oda else 0
    if oda_budget >= 50:
        kf_total = kf_projects["total"] if kf_projects else 0
        kf_last = kf_projects["last_year"] if kf_projects else None
        if kf_total == 0:
            kf_gap = {
                "is_gap": True,
                "reason": f"KOICA ODA 연 {oda_budget}억원 지원 국가이나 KF 공공외교 사업 이력이 없습니다. 개발협력 대비 공공외교 채널이 공백 상태입니다.",
            }
        elif kf_last is not None and kf_last < 2018:
            kf_gap = {
                "is_gap": True,
                "reason": f"KOICA ODA 연 {oda_budget}억원 지원 국가이나 KF 공공외교 사업이 {kf_last}년 이후 중단된 상태입니다.",
            }

    # AI 인사이트 (규칙 기반)
    parts = []
    if learners is not None:
        parts.append(f"세종학당 수강생 {learners:,}명")
    if diaspora_count is not None:
        parts.append(f"재외동포 {diaspora_count:,}명")
    if embassy_count is not None:
        parts.append(f"재외공관 {embassy_count}개소")
    if korean_studies:
        parts.append(f"한국학 운영 대학 {korean_studies['universities']}곳")
    if kf_projects:
        parts.append(f"KF 사업 누적 {kf_projects['total']}건")

    if parts and index is not None:
        ai_insight = (
            f"{country_id}의 공공외교 지수는 {index}/100입니다. "
            f"({', '.join(parts)} 기반 산출)"
        )
    elif parts:
        ai_insight = f"{country_id}: {', '.join(parts)}"
    else:
        ai_insight = f"{country_id}에 대한 공공외교 데이터를 수집 중입니다."
    if kf_gap:
        ai_insight += " ⚠ " + kf_gap["reason"]

    data_sources = [
        "세종학당재단(문체부 산하) 국가별 수강생 현황 (2025)",
        "외교부 재외동포현황 (2021)",
        "외교부 재외공관 정보 API (data.go.kr)",
        "KF 융합 공공외교·ODA 사업정보 (data.go.kr)",
        "KF 해외대학 한국학 과정 운영현황 (2025)",
    ]
    if africa_exchanges:
        data_sources.append("한아프리카재단 지자체-아프리카 교류협력 사례 (2023)")

    return {
        "country_id": country_id,
        "kf_index": index,
        "korean_learners": learners,
        "learners_yoy": learners_yoy,
        "diaspora_count": diaspora_count,
        "embassy_count": embassy_count,
        "sejong_history": sejong_history,
        "korean_studies": korean_studies,
        "kf_projects": kf_projects,
        "africa_exchanges": africa_exchanges,
        "kf_gap": kf_gap,
        "tourists": None,
        "tourists_yoy": None,
        "rank_in_region": f"{region} · 공공외교 지수 기반",
        "channels": channels,
        "trends": trends,
        "timeline": [],
        "ai_insight": ai_insight,
        "data_sources": data_sources,
    }
