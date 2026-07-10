"""
KF(한국국제교류재단)·한아프리카재단 공공데이터 서비스
- 융합_KF-공공외교 사업 정보_KOICA-ODA 사업정보 (data.go.kr, utf-8-sig)
- 해외대학 한국학 과정 운영현황 (data.go.kr, utf-8-sig)
- 지자체_아프리카 교류협력 사례 (data.go.kr, euc-kr)
"""

import csv
import glob
import re
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"

_FUSION_GLOB  = "*융합*KF*공공외교*.csv"
_KSTUDY_GLOB  = "*한국학 과정 운영현황*.csv"
_AFRICA_GLOB  = "*아프리카 교류협력 사례*.csv"

_cache: dict[str, dict | None] = {}


def _find(pattern: str) -> Path | None:
    hits = glob.glob(str(DATA_DIR / pattern))
    return Path(sorted(hits)[-1]) if hits else None


def _read_rows(path: Path) -> list[dict]:
    for enc in ("utf-8-sig", "euc-kr", "cp949"):
        try:
            with open(path, encoding=enc, newline="") as f:
                rows = list(csv.DictReader(f))
            if rows and not any("�" in (k or "") for k in rows[0]):
                return rows
        except (UnicodeDecodeError, UnicodeError):
            continue
    return []


_REGION_TAG = re.compile(r"^\[[^\]]+\]\s*")


def _clean_title(title: str) -> str:
    """사업명 앞의 '[아시아]' 류 지역 태그 제거"""
    return _REGION_TAG.sub("", (title or "").strip())


# ── KF 공공외교 사업 이력 (융합 데이터) ─────────────────────────

def _fusion_by_country() -> dict[str, list[dict]]:
    if "fusion" not in _cache:
        path = _find(_FUSION_GLOB)
        by_country: dict[str, list[dict]] = {}
        if path:
            for r in _read_rows(path):
                if (r.get("사업유형명") or "").strip() != "KF":
                    continue
                country = (r.get("국가명") or "").strip()
                if not country:
                    continue
                by_country.setdefault(country, []).append({
                    "name": _clean_title(r.get("사업명(국문)", "")),
                    "year": (r.get("사업연도") or "").strip(),
                })
        _cache["fusion"] = by_country
    return _cache["fusion"]


def get_kf_projects(ko_name: str) -> dict | None:
    """국가별 KF 공공외교 사업 이력 요약"""
    projects = _fusion_by_country().get(ko_name)
    if not projects:
        return None
    years = sorted(int(p["year"]) for p in projects if p["year"].isdigit())
    recent = sorted(projects, key=lambda p: p["year"], reverse=True)[:5]
    return {
        "total": len(projects),
        "first_year": years[0] if years else None,
        "last_year": years[-1] if years else None,
        "recent": recent,
    }


# ── 해외대학 한국학 과정 운영현황 ────────────────────────────────

def _kstudies_by_country() -> dict[str, dict]:
    if "kstudies" not in _cache:
        path = _find(_KSTUDY_GLOB)
        agg: dict[str, dict] = {}
        if path:
            for r in _read_rows(path):
                country = (r.get("국가") or "").strip()
                if not country:
                    continue
                c = agg.setdefault(country, {
                    "universities": 0, "bachelor": 0, "master": 0,
                    "doctoral": 0, "sejong": 0, "korea_corner": 0,
                })
                c["universities"] += 1
                if (r.get("한국학제공형태학사") or "").strip() == "Y":
                    c["bachelor"] += 1
                if (r.get("한국학제공형태석사") or "").strip() == "Y":
                    c["master"] += 1
                if (r.get("한국학제공형태박사") or "").strip() == "Y":
                    c["doctoral"] += 1
                if (r.get("한국학제공형태세종학당") or "").strip() == "Y":
                    c["sejong"] += 1
                if (r.get("한국학제공형태코리아코너") or "").strip() == "Y":
                    c["korea_corner"] += 1
        _cache["kstudies"] = agg
    return _cache["kstudies"]


def get_korean_studies(ko_name: str) -> dict | None:
    """국가별 한국학 운영 대학·과정 현황"""
    return _kstudies_by_country().get(ko_name)


# ── 지자체-아프리카 교류협력 사례 ────────────────────────────────

def _africa_by_country() -> dict[str, list[dict]]:
    if "africa" not in _cache:
        path = _find(_AFRICA_GLOB)
        by_country: dict[str, list[dict]] = {}
        if path:
            for r in _read_rows(path):
                country = (r.get("아프리카 국가") or "").strip()
                if not country:
                    continue
                by_country.setdefault(country, []).append({
                    "province": (r.get("광역시도") or "").strip(),
                    "city": (r.get("기초지자체") or "").strip(),
                    "partner": (r.get("아프리카 지자체") or "").strip(),
                    "year": (r.get("교류연도") or "").strip(),
                    "type": (r.get("교류유형") or "").strip(),
                    "desc": (r.get("주요내용") or "").strip(),
                })
        _cache["africa"] = by_country
    return _cache["africa"]


def get_africa_exchanges(ko_name: str) -> dict | None:
    """국내 지자체-아프리카 국가 교류협력 선례"""
    cases = _africa_by_country().get(ko_name)
    if not cases:
        return None
    recent = sorted(cases, key=lambda c: c["year"], reverse=True)[:5]
    return {"total": len(cases), "cases": recent}


# ── 공공외교 공백 판정 ──────────────────────────────────────────

GAP_MIN_ODA = 50      # 연 지원액 기준 (억원)
GAP_STALE_YEAR = 2018  # 최근 사업 이력이 이 연도 이전에만 확인되면 공백 후보로 분류


def compute_kf_gap(ko_name: str, oda_budget: float) -> dict | None:
    """ODA 지원은 활발하지만 KF 사업 이력이 없거나 오래된 국가를 공백 후보로 감지."""
    if oda_budget < GAP_MIN_ODA:
        return None
    proj = get_kf_projects(ko_name)
    total = proj["total"] if proj else 0
    last_year = proj["last_year"] if proj else None
    if total == 0:
        return {
            "is_gap": True,
            "kf_total": 0,
            "kf_last_year": None,
            "reason": f"KOICA ODA 연 {oda_budget}억원 지원 국가이나 KF 공공외교 사업 이력이 없습니다. 개발협력 대비 공공외교 채널이 공백 상태입니다.",
        }
    if last_year is not None and last_year < GAP_STALE_YEAR:
        return {
            "is_gap": True,
            "kf_total": total,
            "kf_last_year": last_year,
            "reason": (
                f"KOICA ODA 연 {oda_budget}억원 지원 국가이나 KF 데이터에서 확인되는 "
                f"최근 공공외교 사업 이력은 {last_year}년입니다. 공식 중단 여부가 아니라 "
                "추가 조사가 필요한 공백 후보 신호입니다."
            ),
        }
    return None
