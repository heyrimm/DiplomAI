"""
KOICA 국가별 지원실적 CSV 파서
- 컬럼: 지역, 국가명, 연도, 원, 달러
- EUC-KR / CP949 인코딩 자동 처리
"""

import csv
import glob
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"

# 하위호환: 영어 슬러그 → 한국어 국가명 매핑 (기존 4개국)
LEGACY_ID_TO_KO = {
    "indonesia": "인도네시아",
    "vietnam":   "베트남",
    "cambodia":  "캄보디아",
    "ethiopia":  "에티오피아",
}


def _find_koica_csv() -> Path | None:
    for pat in [
        str(DATA_DIR / "*KOICA*"),
        str(DATA_DIR / "*koica*"),
        str(DATA_DIR / "*지원실적*"),
        str(DATA_DIR / "*국가별*"),
        str(DATA_DIR / "*.csv"),
    ]:
        csvs = [f for f in glob.glob(pat) if f.endswith(".csv")]
        if csvs:
            return Path(sorted(csvs)[-1])
    return None


def _detect_encoding(path: Path) -> str:
    for enc in ("euc-kr", "cp949", "utf-8-sig", "utf-8"):
        try:
            with open(path, encoding=enc) as f:
                f.read(512)
            return enc
        except (UnicodeDecodeError, LookupError):
            continue
    return "utf-8"


def _resolve_ko_name(country_id: str) -> str | None:
    """country_id가 영어 슬러그면 한국어명으로, 이미 한국어면 그대로."""
    if country_id in LEGACY_ID_TO_KO:
        return LEGACY_ID_TO_KO[country_id]
    # 한국어 이름이 직접 들어온 경우 (신규 방식)
    return country_id if country_id else None


def _load_country_rows(country_id: str) -> list[dict]:
    """국가 ID/한국어명에 해당하는 모든 행 반환 (연도 오름차순)."""
    csv_path = _find_koica_csv()
    if csv_path is None:
        return []

    target_name = _resolve_ko_name(country_id)
    if not target_name:
        return []

    enc = _detect_encoding(csv_path)
    rows = []
    try:
        with open(csv_path, encoding=enc, newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if (row.get("국가명") or "").strip() == target_name:
                    rows.append(row)
    except Exception:
        pass

    return sorted(rows, key=lambda r: int(r.get("연도") or 0))


def get_country_history(country_id: str) -> list[dict]:
    """연도별 KOICA 지원 실적 반환 (2010년 이후)."""
    rows = _load_country_rows(country_id)
    result = []
    for row in rows:
        try:
            year = int(row.get("연도") or 0)
            if year < 2010:
                continue
            won = int((row.get("원") or "0").replace(",", ""))
            usd = int((row.get("달러") or "0").replace(",", ""))
            result.append({
                "year": year,
                "budget_억원": round(won / 1e8, 1),
                "budget_만달러": round(usd / 1e4, 1),
            })
        except ValueError:
            continue
    return result


def get_country_latest(country_id: str) -> dict | None:
    """가장 최근 연도 데이터 + 전년 대비 증감률 반환."""
    history = get_country_history(country_id)
    if not history:
        return None

    latest = history[-1]
    yoy = None
    if len(history) >= 2:
        prev = history[-2]["budget_억원"]
        curr = latest["budget_억원"]
        if prev > 0:
            yoy = round((curr - prev) / prev * 100, 1)

    return {**latest, "yoy_pct": yoy}


def search_countries_in_csv(query: str, limit: int = 15) -> list[str]:
    """
    CSV에 실제 지원 실적이 있는 국가 중 query로 검색.
    반환: 한국어 국가명 리스트
    """
    csv_path = _find_koica_csv()
    if csv_path is None:
        return []

    enc = _detect_encoding(csv_path)
    seen: set[str] = set()
    results: list[str] = []

    # 국제기구·기타 제외 키워드
    exclude_prefixes = (
        "AIT", "ANC", "APSDEP", "AfDF", "ALADI", "ADB", "APEC", "ASEAN",
        "Asia Foundation", "AU", "CCOP", "CERF", "CPSC", "CP", "CSD",
        "EAC", "EBRD", "FAO", "ILO", "IMO", "IOM", "IPPF", "ITC", "ITLOS",
        "IVI", "MEDRC", "Millennium", "MOPAN", "MRC", "UN", "WFP", "WHO",
        "WMO", "World Bank", "WTO", "OECD", "UNDP", "UNICEF", "UNHCR",
        "UNESCO", "UNEP", "UNIDO", "UNFPA", "IVF", "GGGI", "GPE", "IAEA",
        "ICC", "ICRC", "IDC", "IFAD", "IFRC", "IVF", "OAS", "OAU",
        "PAHO", "PIF", "SIDS", "SOPAC", "SPC", "국제기구", "기타", "일반",
        "다국지원", "다자기구", "유엔", "남미다국", "동남아대테러", "마드리드",
        "유엔지뢰", "사하라이남아프리카",
    )

    try:
        with open(csv_path, encoding=enc, newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = (row.get("국가명") or "").strip()
                if not name or name in seen:
                    continue
                # 국제기구·기타 제외
                if any(name.startswith(p) for p in exclude_prefixes):
                    continue
                # 검색어 필터
                if query and query not in name:
                    continue
                seen.add(name)
                results.append(name)
                if len(results) >= limit:
                    break
    except Exception:
        pass

    return results


def get_csv_metadata() -> dict:
    csv_path = _find_koica_csv()
    if csv_path is None:
        return {"found": False, "filename": None, "source": "mock"}
    return {
        "found": True,
        "filename": csv_path.name,
        "encoding": _detect_encoding(csv_path),
        "source": "KOICA 국가별 지원실적 (data.go.kr)",
    }
