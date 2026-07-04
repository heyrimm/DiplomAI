"""
KOICA 협력국 통합 개발 지표 CSV + 사업분야별 ODA실적통계 CSV 파서
출처: 한국국제협력단 (data.go.kr)

제공 기능:
- 국가별 HDI, 1인당 GDP, 인구, 인터넷 사용률, 부패인식점수
- 국가별 KOICA 섹터별 누적 지원 규모 (→ 비율로 연간 총액 분배)
- 사업분야별 연도별 전국 섹터 비중 (국가 데이터 없을 때 fallback)
- SDG 섹터 매핑
"""

import csv
import os
import re

_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
_DEV_FILE  = os.path.join(_DATA_DIR, "한국국제협력단_협력국 통합 개발 지표_20230614.csv")
_SEC_FILE  = os.path.join(_DATA_DIR, "한국국제협력단_사업분야별 ODA실적통계_20241002.csv")
_SDG_FILE  = os.path.join(_DATA_DIR, "한국국제협력단_SDG 분야별 성과지표_20230901.csv")

# ─────────────────────────────────────────────
# 섹터 이름 정규화 (CSV 원본 → 표시 이름)
# ─────────────────────────────────────────────
SECTOR_DISPLAY = {
    "공공행정":       "공공행정",
    "교육":           "교육",
    "기술환경에너지": "기술·환경·에너지",
    "기타":           "기타",
    "긴급구호":       "긴급구호",
    "농림수산":       "농림수산",
    "보건":           "보건",
    "보건의료":       "보건",   # 사업분야별 CSV 표기
    "보건긴급":       "보건",   # 구 표기
}

SECTOR_COLS = [
    ("sector_gov",       "공공행정",       "한국국제협력단 지원 규모_공공행정"),
    ("sector_edu",       "교육",           "한국국제협력단 지원 규모_교육"),
    ("sector_env",       "기술·환경·에너지","한국국제협력단 지원 규모_기술환경에너지"),
    ("sector_emergency", "긴급구호",       "한국국제협력단 지원 규모_긴급구호"),
    ("sector_agri",      "농림수산",       "한국국제협력단 지원 규모_농림수산"),
    ("sector_health",    "보건",           "한국국제협력단 지원 규모_보건"),
    ("sector_other",     "기타",           "한국국제협력단 지원 규모_기타"),
]

# ─────────────────────────────────────────────
# 협력국 통합 개발 지표 로드 (1회)
# ─────────────────────────────────────────────
_INDICATOR_CACHE: dict[str, dict] = {}
_INDICATOR_LOADED = False


def _load_indicators() -> dict[str, dict]:
    global _INDICATOR_LOADED
    if _INDICATOR_LOADED:
        return _INDICATOR_CACHE
    _INDICATOR_LOADED = True

    try:
        with open(_DEV_FILE, encoding="euc-kr", errors="replace") as f:
            reader = csv.DictReader(f)
            for row in reader:
                ko = row.get("국가명_국문(한국국제협력단)", "").strip()
                if not ko:
                    continue

                def _f(key: str) -> float | None:
                    v = row.get(key, "").strip()
                    try:
                        return float(v) if v else None
                    except ValueError:
                        return None

                sectors: dict[str, float] = {}
                for key, _display, col in SECTOR_COLS:
                    v = _f(col)
                    if v is not None and v > 0:
                        sectors[key] = v

                _INDICATOR_CACHE[ko] = {
                    "hdi":             _f("인간개발지수"),
                    "gdp_per_capita":  _f("1인당 국내총생산"),
                    "population":      _f("인구수"),
                    "internet_usage":  _f("인터넷 사용률"),
                    "corruption_score":_f("부패인식점수"),
                    "gii":             _f("젠더 불평등 지수"),
                    "income_level":    row.get("소득 기준(OECD)", "").strip() or None,
                    "region_en":       row.get("지역명_영문(한국국제협력단)", "").strip() or None,
                    "sector_total_usd":_f("한국국제협력단 지원 규모_전체"),
                    **sectors,
                }
    except FileNotFoundError:
        pass

    return _INDICATOR_CACHE


def get_country_indicators(ko_name: str) -> dict | None:
    """국가별 HDI·GDP·인구·인터넷·부패지수 등 개발지표 반환."""
    return _load_indicators().get(ko_name)


# ─────────────────────────────────────────────
# 국가별 섹터 분배 비율 계산
# ─────────────────────────────────────────────
def get_sector_proportions(ko_name: str) -> dict[str, float] | None:
    """
    협력국 통합 개발 지표 CSV 기반 섹터별 누적 지원 비율 반환.
    예: {"교육": 0.23, "보건": 0.18, ...}
    """
    d = _load_indicators().get(ko_name)
    if d is None:
        return None

    total = d.get("sector_total_usd") or 0
    if total <= 0:
        return None

    props: dict[str, float] = {}
    for key, display, _col in SECTOR_COLS:
        v = d.get(key)
        if v and v > 0:
            props[display] = round(v / total, 4)

    return props if props else None


def get_regional_sector_proportions(region_ko: str) -> dict[str, float]:
    """
    지역(한국어) 내 국가들의 섹터별 누적 지원 비율 평균.
    예: "동남아시아" → {"교육": 0.25, "보건": 0.20, ...}
    원형 임포트 방지를 위해 함수 내에서 COUNTRY_META를 로드.
    """
    from data.country_meta import COUNTRY_META  # pylint: disable=import-outside-toplevel

    buckets: dict[str, list[float]] = {}
    for ko_name, meta in COUNTRY_META.items():
        if meta.get("region") != region_ko:
            continue
        props = get_sector_proportions(ko_name)
        if not props:
            continue
        for sector, p in props.items():
            buckets.setdefault(sector, []).append(p)

    if not buckets:
        return {}
    return {s: round(sum(vs) / len(vs), 4) for s, vs in buckets.items()}


def get_sector_breakdown(ko_name: str, annual_total_억원: float) -> list[dict] | None:
    """
    연간 총액(억원)을 실제 섹터 비율로 분배한 리스트 반환.
    [{sector, budget, projects}, ...]  budget 내림차순 정렬
    """
    props = get_sector_proportions(ko_name)
    if props is None or annual_total_억원 <= 0:
        return None

    result = []
    for display, pct in props.items():
        budget = round(annual_total_억원 * pct, 1)
        if budget > 0:
            result.append({
                "sector":   display,
                "budget":   budget,
                "projects": max(1, round(budget / 15)),
            })

    return sorted(result, key=lambda x: x["budget"], reverse=True)


# ─────────────────────────────────────────────
# 사업분야별 전국 섹터 비중 (fallback용)
# ─────────────────────────────────────────────
_NATIONAL_SECTOR_CACHE: dict[int, dict[str, float]] = {}
_NATIONAL_LOADED = False


def _load_national_sectors() -> dict[int, dict[str, float]]:
    global _NATIONAL_LOADED
    if _NATIONAL_LOADED:
        return _NATIONAL_SECTOR_CACHE
    _NATIONAL_LOADED = True

    try:
        by_year: dict[int, dict[str, float]] = {}
        with open(_SEC_FILE, encoding="euc-kr", errors="replace") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    year = int(row["연도"])
                except (KeyError, ValueError):
                    continue
                sector = SECTOR_DISPLAY.get(row.get("사업분야", "").strip(), row.get("사업분야", "").strip())
                try:
                    amt = float(row.get("금액달러", 0) or 0)
                except ValueError:
                    amt = 0.0
                if year not in by_year:
                    by_year[year] = {}
                by_year[year][sector] = by_year[year].get(sector, 0) + amt
        _NATIONAL_SECTOR_CACHE.update(by_year)
    except FileNotFoundError:
        pass

    return _NATIONAL_SECTOR_CACHE


def get_national_sector_weights(year: int | None = None) -> dict[str, float]:
    """
    전국 사업분야별 비중 반환 (비율 0~1 합계≈1).
    year=None이면 최신 연도 사용.
    """
    data = _load_national_sectors()
    if not data:
        # 데이터 없으면 기본 비율
        return {
            "교육": 0.20, "보건": 0.18, "농림수산": 0.15,
            "기술·환경·에너지": 0.15, "공공행정": 0.14,
            "긴급구호": 0.08, "기타": 0.10,
        }

    y = year if (year and year in data) else max(data.keys())
    totals = data[y]
    grand = sum(totals.values()) or 1
    return {s: round(v / grand, 4) for s, v in sorted(totals.items(), key=lambda x: x[1], reverse=True)}


# ─────────────────────────────────────────────
# SDG 섹터 매핑 (CSV 기반)
# ─────────────────────────────────────────────

# SDG 분야명 → 협력국 지원 섹터 이름 매핑
_SDG_SECTOR_MAP = {
    "거버넌스_평화": "공공행정",
    "거버넌스":      "공공행정",
    "인권":          "공공행정",
    "과학기술혁신":  "기술·환경·에너지",
    "교통":          "기술·환경·에너지",
    "에너지":        "기술·환경·에너지",
    "도시":          "기술·환경·에너지",
    "환경":          "기술·환경·에너지",
    "기후변화":      "기술·환경·에너지",
    "기후행동":      "기술·환경·에너지",
    "교육":          "교육",
    "농림수산":      "농림수산",
    "농촌개발":      "농림수산",
    "보건":          "보건",
    "물":            "보건",
    "물·위생":       "보건",
    "성평등":        "기타",
    "긴급구호":      "긴급구호",
}

_SDG_BY_SECTOR: dict[str, list[str]] = {}
_SDG_LOADED = False


def _load_sdg_mapping():
    global _SDG_LOADED
    if _SDG_LOADED:
        return
    _SDG_LOADED = True

    pattern = re.compile(r"SDG\s*(\d+[\.\d]*)", re.IGNORECASE)
    acc: dict[str, set[str]] = {}

    try:
        with open(_SDG_FILE, encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            for row in reader:
                raw_sector = (row.get("﻿분야") or row.get("분야") or "").strip()
                sector = _SDG_SECTOR_MAP.get(raw_sector, raw_sector)
                if not sector:
                    continue
                result_text = row.get("성과", "")
                for m in pattern.findall(result_text):
                    goal = "SDG " + m.split(".")[0]
                    acc.setdefault(sector, set()).add(goal)
    except FileNotFoundError:
        pass

    _SDG_BY_SECTOR.update({k: sorted(v) for k, v in acc.items()})


def get_sdg_goals(sector: str) -> list[str]:
    """섹터명 → 해당 섹터 SDG 목표 리스트 반환."""
    _load_sdg_mapping()
    return _SDG_BY_SECTOR.get(sector, [])


def get_all_sdg_mapping() -> dict[str, list[str]]:
    _load_sdg_mapping()
    return dict(_SDG_BY_SECTOR)
