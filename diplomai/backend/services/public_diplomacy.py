"""
공공외교 데이터 서비스
- 세종학당재단_국가별 세종학당 수강생 수 현황_20251231.csv
- 외교부_재외동포현황(csv)_20220228.csv
- data.go.kr 재외공관 API
"""

import csv
import math
import os
import time
from functools import lru_cache
from pathlib import Path
from typing import Optional

import httpx

DATA_DIR = Path(__file__).parent.parent / "data"

_YEAR_COLS_SEJONG = ["2021년", "2022년", "2023년", "2024년", "2025년"]


def _detect_encoding(path: Path) -> str:
    for enc in ("utf-8-sig", "utf-8", "euc-kr", "cp949"):
        try:
            with open(path, encoding=enc) as f:
                f.read(2048)
            return enc
        except UnicodeDecodeError:
            continue
    return "utf-8"


# ── CSV 로더 ──────────────────────────────────────────────────

def _load_sejong() -> dict[str, dict]:
    """국가명(한국어) → {history, latest, yoy}"""
    candidates = list(DATA_DIR.glob("세종학당*수강생*"))
    if not candidates:
        return {}
    path = candidates[0]
    enc = _detect_encoding(path)
    result: dict[str, dict] = {}
    with open(path, encoding=enc, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row.get("국가명", "").strip()
            if not name or name in ("합계", "대한민국"):
                continue
            counts: dict[str, int] = {}
            for y in _YEAR_COLS_SEJONG:
                raw = row.get(y, "").strip().replace(",", "")
                counts[y] = int(raw) if raw.lstrip("-").isdigit() else 0
            latest = counts.get("2025년", 0) or counts.get("2024년", 0)
            prev = counts.get("2024년", 0) or counts.get("2023년", 0)
            yoy: float | None = None
            if prev > 0:
                yoy = round((latest - prev) / prev * 100, 1)
            result[name] = {"history": counts, "latest": latest, "yoy": yoy}
    return result


def _load_diaspora() -> dict[str, int]:
    """국가명(한국어) → 재외동포 수 (2021년 기준)"""
    candidates = list(DATA_DIR.glob("외교부_재외동포*"))
    if not candidates:
        return {}
    path = candidates[0]
    enc = _detect_encoding(path)
    result: dict[str, int] = {}
    with open(path, encoding=enc, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row.get("국가명", "").strip()
            if not name or name == "합계":
                continue
            raw = row.get("연도 2021", "").strip().replace(",", "")
            result[name] = int(raw) if raw.lstrip("-").isdigit() else 0
    return result


# ── 모듈 수준 캐시 (프로세스 재시작 전까지 유지) ──────────────

@lru_cache(maxsize=1)
def _sejong_all() -> dict[str, dict]:
    return _load_sejong()


@lru_cache(maxsize=1)
def _diaspora_all() -> dict[str, int]:
    return _load_diaspora()


# ── 재외공관 정적 fallback (API 활성화 전 또는 실패 시) ────────
# 출처: 외교부 재외공관 현황 공개 자료 (2024년 기준)
# 영어 국가명 → (대사관+총영사관+분관 합계)
_EMBASSY_FALLBACK: dict[str, int] = {
    # 실 API (EmbassyService2) 데이터 기반 — API 장애 시 fallback
    "Vietnam": 3,
    "Indonesia": 1,
    "Cambodia": 2,
    "Philippines": 2,
    "Myanmar": 1,
    "Laos": 1,
    "Thailand": 2,
    "Malaysia": 2,
    "Timor-Leste": 1,
    "Mongolia": 1,
    "India": 3,
    "Bangladesh": 1,
    "Nepal": 1,
    "Sri Lanka": 1,
    "Pakistan": 2,
    "Afghanistan": 1,
    "Uzbekistan": 1,
    "Kazakhstan": 2,
    "Kyrgyzstan": 1,
    "Tajikistan": 1,
    "Azerbaijan": 1,
    "Georgia": 1,
    "Armenia": 1,
    "Ukraine": 1,
    "Ethiopia": 1,
    "Kenya": 1,
    "Tanzania": 1,
    "Rwanda": 1,
    "Uganda": 1,
    "Ghana": 1,
    "Senegal": 1,
    "Mozambique": 1,
    "Madagascar": 1,
    "Nigeria": 1,
    "Zambia": 1,
    "Egypt": 2,
    "Morocco": 1,
    "Jordan": 1,
    "Iraq": 1,
    "Bolivia": 1,
    "Ecuador": 1,
    "Peru": 1,
    "Colombia": 1,
    "Guatemala": 1,
    "Honduras": 1,
    "Paraguay": 1,
}

# ── 재외공관 API ───────────────────────────────────────────────

_EMBASSY_CACHE: dict = {"data": None, "ts": 0.0}
_EMBASSY_TTL = 86400  # 24h


async def _fetch_embassy_raw() -> dict[str, int]:
    """영어 국가명(country_eng_nm) → 공관 수. 실패시 빈 dict."""
    api_key = os.getenv("DATA_GO_KR_API_KEY", "")
    if not api_key:
        return {}
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
            resp = await client.get(
                "https://apis.data.go.kr/1262000/EmbassyService2/getEmbassyList2",
                params={
                    "serviceKey": api_key,
                    "pageNo": "1",
                    "numOfRows": "1000",
                    "type": "json",
                },
            )
            resp.raise_for_status()
            body = resp.json()
        items = (
            body.get("response", {}).get("body", {})
                .get("items", {}).get("item", [])
        )
        if isinstance(items, dict):
            items = [items]
        counts: dict[str, int] = {}
        for item in (items or []):
            country = (
                item.get("country_eng_nm")
                or item.get("countryEngNm")
                or item.get("country_nm")
                or ""
            ).strip()
            if country:
                counts[country] = counts.get(country, 0) + 1
        return counts
    except Exception:
        return {}


async def _embassy_data() -> dict[str, int]:
    now = time.time()
    if _EMBASSY_CACHE["data"] is not None and now - _EMBASSY_CACHE["ts"] < _EMBASSY_TTL:
        return _EMBASSY_CACHE["data"]
    data = await _fetch_embassy_raw()
    _EMBASSY_CACHE["data"] = data
    _EMBASSY_CACHE["ts"] = now
    return data


# ── 공개 조회 함수 ────────────────────────────────────────────

def get_sejong(ko_name: str) -> dict | None:
    return _sejong_all().get(ko_name)


def get_diaspora(ko_name: str) -> int | None:
    val = _diaspora_all().get(ko_name)
    return val if val else None


async def get_embassy_count(name_en: str) -> Optional[int]:
    """영어 국가명으로 공관 수 조회 (API → fallback 순서)"""
    # API 시도
    data = await _embassy_data()
    if data:
        count = data.get(name_en)
        if count is not None:
            return count
        lower = name_en.lower()
        for k, v in data.items():
            if k.lower() == lower:
                return v

    # API 실패/미활성화 시 fallback 사용
    count = _EMBASSY_FALLBACK.get(name_en)
    if count is not None:
        return count
    lower = name_en.lower()
    for k, v in _EMBASSY_FALLBACK.items():
        if k.lower() == lower:
            return v
    return None


# ── 공공외교 지수 산출 ─────────────────────────────────────────

def compute_diplomacy_index(learners: int, diaspora: int, embassy: int) -> int:
    """
    가중합 공공외교 지수 (0-100)
    - 세종학당 수강생: 35% (log10 스케일, 기준 최대 50,000명)
    - 재외동포: 45% (log10 스케일, 기준 최대 3,000,000명)
    - 재외공관 수: 20% (선형 스케일, 기준 최대 5개)
    """
    if learners <= 0 and diaspora <= 0 and embassy <= 0:
        return 0
    sejong_score = min(math.log10(learners + 1) / math.log10(50_000) * 100, 100)
    diaspora_score = min(math.log10(diaspora + 1) / math.log10(3_000_000) * 100, 100)
    embassy_score = min(embassy / 5 * 100, 100)
    return round(0.35 * sejong_score + 0.45 * diaspora_score + 0.20 * embassy_score)
