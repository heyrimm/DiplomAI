"""
KOTRA 공공데이터 API 클라이언트
- 국가정보:     apis.data.go.kr/B410001/kotra_nationalInformation/natnInfo/natnInfo
- 해외시장뉴스: apis.data.go.kr/B410001/kotra_overseasMarketNews/ovseaMrktNews/ovseaMrktNews
출처: 공공데이터포털 (data.go.kr) — 대한무역투자진흥공사(KOTRA) 제공

주의:
- 게이트웨이 WAF가 기본 UA·`type` 파라미터를 차단하므로 브라우저 UA로 호출하고 type은 생략 (기본 JSON 응답)
- 국가정보는 ISO 2자리 코드(isoWd2CntCd), 뉴스는 한국어 국가명(search1)으로 조회
- 응답 원문이 매우 길어(국가당 400KB+) 국가별 캐시 후 항목당 글자 수를 잘라 프롬프트에 주입
"""

import asyncio
import html
import os
import re
import time

import httpx

BASE_URL = "http://apis.data.go.kr/B410001"
_HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

# 한국어 국가명(country_id) → ISO 3166-1 alpha-2 (KOTRA 국가정보 isoWd2CntCd)
COUNTRY_ISO2_MAP: dict[str, str] = {
    # 동남아시아
    "인도네시아": "ID", "베트남": "VN", "캄보디아": "KH", "미얀마": "MM",
    "라오스": "LA", "필리핀": "PH", "태국": "TH", "동티모르": "TL", "말레이시아": "MY",
    # 남아시아
    "인도": "IN", "방글라데시": "BD", "네팔": "NP", "스리랑카": "LK",
    "파키스탄": "PK", "아프가니스탄": "AF", "부탄": "BT",
    # 동아시아
    "몽골": "MN", "중국": "CN",
    # 중앙아시아·남캅카스·동유럽
    "우즈베키스탄": "UZ", "카자흐스탄": "KZ", "키르기스스탄": "KG",
    "타지키스탄": "TJ", "투르크메니스탄": "TM",
    "아제르바이잔": "AZ", "조지아": "GE", "아르메니아": "AM", "우크라이나": "UA",
    # 사하라이남 아프리카
    "에티오피아": "ET", "케냐": "KE", "탄자니아": "TZ", "르완다": "RW",
    "우간다": "UG", "가나": "GH", "세네갈": "SN", "모잠비크": "MZ",
    "마다가스카르": "MG", "나이지리아": "NG", "잠비아": "ZM", "남수단": "SS",
    "짐바브웨": "ZW", "수단": "SD", "말라위": "MW", "카메룬": "CM",
    "코트디부아르": "CI", "기니": "GN", "앙골라": "AO", "콩고 민주공화국": "CD",
    # 중동·북아프리카
    "이집트": "EG", "팔레스타인": "PS", "모로코": "MA", "요르단": "JO",
    "이라크": "IQ", "튀니지": "TN", "알제리": "DZ", "레바논": "LB",
    # 중남미
    "에콰도르": "EC", "볼리비아": "BO", "페루": "PE", "콜롬비아": "CO",
    "과테말라": "GT", "온두라스": "HN", "니카라과": "NI", "파라과이": "PY",
    "엘살바도르": "SV", "아이티": "HT", "도미니카공화국": "DO", "코스타리카": "CR",
    # 태평양
    "파푸아뉴기니": "PG", "피지": "FJ", "솔로몬군도": "SB",
}

# 뉴스 정보분류(infoCl) 중 진출 가이드 근거로 쓰는 카테고리
_NEWS_CATEGORIES = {"통상·규제", "경제·무역", "투자진출"}

# 국가정보 원문 필드 → 가이드 섹션 매핑 (프롬프트 주입용)
_NATION_SECTIONS: dict[str, list[tuple[str, str]]] = {
    "통관·수입규제": [
        ("tarifSystSumryCntnt", "관세제도 개요"),
        ("entrPrcstCntnt", "통관 시 유의사항"),
        ("imprtPrhbtCmdltCntnt", "수입금지품목"),
        ("crtfcSystCntnt", "인증제도"),
    ],
    "법률·투자규제": [
        ("frgnrInvtRppcdCntnt", "외국인투자법·법인 설립"),
        ("lmttPrhbtIndlnCntnt", "제한·금지 업종"),
        ("encrgPolcyCntnt", "투자 인센티브"),
        ("frxcgRlateReglCntnt", "외환 규제"),
        ("crrxCntnt", "법인세"),
        ("laborTimeCntnt", "근로시간"),
        ("dismlCntnt", "해고 규정"),
    ],
    "비즈니스 관례": [
        ("bizdlPrcstCntnt", "상거래 시 유의사항"),
        ("cnsltClturPrcstCntnt", "상담·문화적 유의사항"),
        ("korCmmdtImageCntnt", "한국 상품 이미지"),
    ],
    "진출 전략": [
        ("invtAdvncAtnotiCntnt", "투자진출 시 유의사항"),
        ("skmnyCntnt", "주식회사 설립"),
        ("brffcCntnt", "지사 설립"),
        ("advncSucsCaseCntnt", "진출 성공사례"),
    ],
}

# 국가정보 원문 캐시 (TTL 24시간 — 갱신 주기가 긴 자료)
_NATION_CACHE: dict[str, dict] = {}
_NEWS_CACHE: dict[str, dict] = {}
_NATION_TTL = 86400
_NEWS_TTL = 3600 * 6

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"[ \t\r\xa0]+")
_NL_RE = re.compile(r"\n{3,}")


def _get_key() -> str | None:
    return os.getenv("DATA_GO_KR_API_KEY")


def _clean(text: str | None) -> str:
    """HTML 엔티티·태그 제거, 공백 정리."""
    if not text:
        return ""
    t = html.unescape(html.unescape(text))
    t = _TAG_RE.sub(" ", t)
    t = _WS_RE.sub(" ", t)
    t = _NL_RE.sub("\n\n", t)
    return t.strip()


def _trim(text: str, limit: int) -> str:
    """문장 중간에서 끊기지 않게 limit 근처에서 자름."""
    if len(text) <= limit:
        return text
    cut = text[:limit]
    # 마지막 문장 경계(마침표/개행)에서 자르기
    for sep in ("다.", ".\n", "\n"):
        idx = cut.rfind(sep)
        if idx > limit * 0.6:
            return cut[: idx + len(sep)].strip() + " …(후략)"
    return cut.strip() + " …(후략)"


async def _fetch_nation_raw(iso2: str) -> dict | None:
    """KOTRA 국가정보 원문 조회 (국가별 24h 캐시).

    게이트웨이 WAF가 간헐적으로 요청을 튕기므로 1회 재시도하고,
    실패 결과는 캐시하지 않는다 (한 번의 실패가 24시간 지속되는 것 방지).
    """
    cached = _NATION_CACHE.get(iso2)
    if cached and (time.time() - cached["ts"]) < _NATION_TTL:
        return cached["item"]

    api_key = _get_key()
    if not api_key:
        return None

    url = f"{BASE_URL}/kotra_nationalInformation/natnInfo/natnInfo"
    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(30.0), headers=_HEADERS) as client:
                resp = await client.get(url, params={"serviceKey": api_key, "isoWd2CntCd": iso2})
                resp.raise_for_status()
                data = resp.json()
            item = (
                data.get("response", {}).get("body", {})
                    .get("itemList", {}).get("item")
            )
            if isinstance(item, list):
                item = item[0] if item else None
            if isinstance(item, dict):
                _NATION_CACHE[iso2] = {"item": item, "ts": time.time()}
                return item
        except Exception:
            pass
        if attempt == 0:
            await asyncio.sleep(0.5)
    return None


async def fetch_nation_brief(country_id: str, per_field: int = 900) -> dict | None:
    """국가정보를 가이드 섹션별 요약 텍스트로 정리.

    반환: {"sections": {섹션명: "· 소제목: 내용 …"}, "offices": [무역관], "source": …}
    KOTRA 미제공 국가는 None.
    """
    iso2 = COUNTRY_ISO2_MAP.get(country_id)
    if not iso2:
        return None
    item = await _fetch_nation_raw(iso2)
    if not item:
        return None

    sections: dict[str, str] = {}
    for section, fields in _NATION_SECTIONS.items():
        parts = []
        for field, label in fields:
            text = _clean(item.get(field))
            if text:
                parts.append(f"[{label}] {_trim(text, per_field)}")
        if parts:
            sections[section] = "\n".join(parts)

    # KOTRA 무역관 연락처 (확인 채널용)
    offices = []
    ovrof = item.get("ovrofCntntList") or {}
    entries = ovrof.get("ovrofCntnt") or []
    if isinstance(entries, dict):
        entries = [entries]
    for o in entries:
        name = _clean(o.get("ovrofNm"))
        addr = _clean(o.get("ovrofAddrCntnt"))
        if name:
            offices.append({"name": name, "contact": _trim(addr, 300)})

    if not sections:
        return None
    return {
        "country_id": country_id,
        "sections": sections,
        "offices": offices,
        "source": "KOTRA 국가정보 (data.go.kr)",
    }


async def fetch_trade_news(country_id: str, limit: int = 5) -> list[dict]:
    """국가별 최신 통상·규제/경제·무역/투자진출 뉴스 조회 (요약 포함).

    search8은 문서화되지 않은 '요약·본문 포함' 플래그. 본문(newsBdt)은 수백 KB라 버리고
    내용요약(cntntSumar)만 사용.
    """
    cached = _NEWS_CACHE.get(country_id)
    if cached and (time.time() - cached["ts"]) < _NEWS_TTL:
        return cached["items"][:limit]

    api_key = _get_key()
    if not api_key:
        return []

    url = f"{BASE_URL}/kotra_overseasMarketNews/ovseaMrktNews/ovseaMrktNews"
    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(30.0), headers=_HEADERS) as client:
                resp = await client.get(url, params={
                    "serviceKey": api_key,
                    "numOfRows": "60",
                    "pageNo": "1",
                    "search1": country_id,   # KOTRA 뉴스는 한국어 국가명으로 검색
                    "search8": "1",          # 내용요약 포함
                })
                resp.raise_for_status()
                data = resp.json()
            items = (
                data.get("response", {}).get("body", {})
                    .get("itemList", {}).get("item", [])
            )
            if isinstance(items, dict):
                items = [items]

            news = []
            for it in items:
                if (it.get("infoCl") or "") not in _NEWS_CATEGORIES:
                    continue
                news.append({
                    "date": it.get("othbcDt") or "",
                    "category": it.get("infoCl") or "",
                    "title": _clean(it.get("newsTitl")),
                    "summary": _trim(_clean(it.get("cntntSumar")), 300),
                    "office": it.get("ovrofInfo") or "",
                    "url": it.get("kotraNewsUrl") or "",
                })
            _NEWS_CACHE[country_id] = {"items": news, "ts": time.time()}
            return news[:limit]
        except Exception:
            if attempt == 0:
                await asyncio.sleep(0.5)
    return []
