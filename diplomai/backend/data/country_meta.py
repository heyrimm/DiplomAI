"""
주요 KOICA 수원국 기본 정보 (2022-2023 기준)
출처: World Bank, UN HDR, KOICA 연차보고서
"""

# 한국어 국가명 → 메타데이터
# id는 URL-safe 영어 슬러그 (CSV 국가명 → id 매핑에 사용)
COUNTRY_META: dict[str, dict] = {
    # ── 동남아시아 ──
    "인도네시아": {"id": "인도네시아", "name_en": "Indonesia",    "region": "동남아시아",       "income_level": "중하위소득국", "population": 277534122, "gdp_per_capita": 4788,  "hdi": 0.705},
    "베트남":     {"id": "베트남",     "name_en": "Vietnam",      "region": "동남아시아",       "income_level": "중하위소득국", "population": 97468029,  "gdp_per_capita": 3694,  "hdi": 0.703},
    "캄보디아":   {"id": "캄보디아",   "name_en": "Cambodia",     "region": "동남아시아",       "income_level": "최빈개도국",   "population": 16713015,  "gdp_per_capita": 1786,  "hdi": 0.593},
    "미얀마":     {"id": "미얀마",     "name_en": "Myanmar",      "region": "동남아시아",       "income_level": "최빈개도국",   "population": 54409800,  "gdp_per_capita": 1209,  "hdi": 0.585},
    "라오스":     {"id": "라오스",     "name_en": "Laos",         "region": "동남아시아",       "income_level": "최빈개도국",   "population": 7379358,   "gdp_per_capita": 2035,  "hdi": 0.607},
    "필리핀":     {"id": "필리핀",     "name_en": "Philippines",  "region": "동남아시아",       "income_level": "중하위소득국", "population": 113880328, "gdp_per_capita": 3522,  "hdi": 0.710},
    "태국":       {"id": "태국",       "name_en": "Thailand",     "region": "동남아시아",       "income_level": "중상위소득국", "population": 71801279,  "gdp_per_capita": 7233,  "hdi": 0.800},
    "동티모르":   {"id": "동티모르",   "name_en": "Timor-Leste",  "region": "동남아시아",       "income_level": "최빈개도국",   "population": 1360596,   "gdp_per_capita": 1439,  "hdi": 0.607},
    "말레이시아": {"id": "말레이시아", "name_en": "Malaysia",     "region": "동남아시아",       "income_level": "중상위소득국", "population": 33574341,  "gdp_per_capita": 12364, "hdi": 0.803},
    # ── 남아시아 ──
    "인도":       {"id": "인도",       "name_en": "India",        "region": "남아시아",         "income_level": "중하위소득국", "population": 1428627663,"gdp_per_capita": 2389,  "hdi": 0.644},
    "방글라데시": {"id": "방글라데시", "name_en": "Bangladesh",   "region": "남아시아",         "income_level": "최빈개도국",   "population": 169356251, "gdp_per_capita": 2688,  "hdi": 0.661},
    "네팔":       {"id": "네팔",       "name_en": "Nepal",        "region": "남아시아",         "income_level": "최빈개도국",   "population": 29136808,  "gdp_per_capita": 1204,  "hdi": 0.601},
    "스리랑카":   {"id": "스리랑카",   "name_en": "Sri Lanka",    "region": "남아시아",         "income_level": "중하위소득국", "population": 22156000,  "gdp_per_capita": 3354,  "hdi": 0.780},
    "파키스탄":   {"id": "파키스탄",   "name_en": "Pakistan",     "region": "남아시아",         "income_level": "중하위소득국", "population": 231402117, "gdp_per_capita": 1505,  "hdi": 0.544},
    "아프가니스탄":{"id":"아프가니스탄","name_en": "Afghanistan",  "region": "남아시아",         "income_level": "최빈개도국",   "population": 40754388,  "gdp_per_capita": 363,   "hdi": 0.478},
    "부탄":       {"id": "부탄",       "name_en": "Bhutan",       "region": "남아시아",         "income_level": "중하위소득국", "population": 782455,    "gdp_per_capita": 3198,  "hdi": 0.681},
    # ── 동아시아 ──
    "몽골":       {"id": "몽골",       "name_en": "Mongolia",     "region": "동아시아",         "income_level": "중하위소득국", "population": 3347782,   "gdp_per_capita": 4567,  "hdi": 0.737},
    # ── 중앙아시아 ──
    "우즈베키스탄":{"id":"우즈베키스탄","name_en": "Uzbekistan",   "region": "중앙아시아",       "income_level": "중하위소득국", "population": 35300000,  "gdp_per_capita": 2148,  "hdi": 0.727},
    "카자흐스탄": {"id": "카자흐스탄", "name_en": "Kazakhstan",   "region": "중앙아시아",       "income_level": "중상위소득국", "population": 19397998,  "gdp_per_capita": 10371, "hdi": 0.802},
    "키르기스스탄":{"id":"키르기스스탄","name_en": "Kyrgyzstan",   "region": "중앙아시아",       "income_level": "중하위소득국", "population": 6791000,   "gdp_per_capita": 1245,  "hdi": 0.692},
    "타지키스탄": {"id": "타지키스탄", "name_en": "Tajikistan",   "region": "중앙아시아",       "income_level": "중하위소득국", "population": 9900000,   "gdp_per_capita": 1143,  "hdi": 0.685},
    "투르크메니스탄":{"id":"투르크메니스탄","name_en":"Turkmenistan","region":"중앙아시아",      "income_level": "중상위소득국", "population": 6100000,   "gdp_per_capita": 8077,  "hdi": 0.745},
    "아제르바이잔":{"id":"아제르바이잔","name_en": "Azerbaijan",   "region": "남캅카스",         "income_level": "중상위소득국", "population": 10139177,  "gdp_per_capita": 5349,  "hdi": 0.745},
    "조지아":     {"id": "조지아",     "name_en": "Georgia",      "region": "남캅카스",         "income_level": "중하위소득국", "population": 3728573,   "gdp_per_capita": 6258,  "hdi": 0.802},
    "아르메니아": {"id": "아르메니아", "name_en": "Armenia",      "region": "남캅카스",         "income_level": "중하위소득국", "population": 2777970,   "gdp_per_capita": 6037,  "hdi": 0.776},
    "우크라이나": {"id": "우크라이나", "name_en": "Ukraine",      "region": "동유럽",           "income_level": "중하위소득국", "population": 43531422,  "gdp_per_capita": 3984,  "hdi": 0.773},
    # ── 사하라이남 아프리카 ──
    "에티오피아": {"id": "에티오피아", "name_en": "Ethiopia",     "region": "사하라이남 아프리카","income_level": "최빈개도국",  "population": 123379924, "gdp_per_capita": 1020,  "hdi": 0.492},
    "케냐":       {"id": "케냐",       "name_en": "Kenya",        "region": "사하라이남 아프리카","income_level": "중하위소득국","population": 54985698,  "gdp_per_capita": 1998,  "hdi": 0.601},
    "탄자니아":   {"id": "탄자니아",   "name_en": "Tanzania",     "region": "사하라이남 아프리카","income_level": "최빈개도국",  "population": 63298550,  "gdp_per_capita": 1136,  "hdi": 0.532},
    "르완다":     {"id": "르완다",     "name_en": "Rwanda",       "region": "사하라이남 아프리카","income_level": "최빈개도국",  "population": 13461888,  "gdp_per_capita": 908,   "hdi": 0.543},
    "우간다":     {"id": "우간다",     "name_en": "Uganda",       "region": "사하라이남 아프리카","income_level": "최빈개도국",  "population": 47249585,  "gdp_per_capita": 883,   "hdi": 0.544},
    "가나":       {"id": "가나",       "name_en": "Ghana",        "region": "사하라이남 아프리카","income_level": "중하위소득국","population": 32395450,  "gdp_per_capita": 2310,  "hdi": 0.632},
    "세네갈":     {"id": "세네갈",     "name_en": "Senegal",      "region": "사하라이남 아프리카","income_level": "최빈개도국",  "population": 17196301,  "gdp_per_capita": 1651,  "hdi": 0.511},
    "모잠비크":   {"id": "모잠비크",   "name_en": "Mozambique",   "region": "사하라이남 아프리카","income_level": "최빈개도국",  "population": 32790338,  "gdp_per_capita": 519,   "hdi": 0.456},
    "마다가스카르":{"id":"마다가스카르","name_en": "Madagascar",   "region": "사하라이남 아프리카","income_level": "최빈개도국",  "population": 27691018,  "gdp_per_capita": 502,   "hdi": 0.476},
    "나이지리아": {"id": "나이지리아", "name_en": "Nigeria",      "region": "사하라이남 아프리카","income_level": "중하위소득국","population": 213401323, "gdp_per_capita": 2097,  "hdi": 0.535},
    "잠비아":     {"id": "잠비아",     "name_en": "Zambia",       "region": "사하라이남 아프리카","income_level": "최빈개도국",  "population": 19473125,  "gdp_per_capita": 1167,  "hdi": 0.565},
    "남수단":     {"id": "남수단",     "name_en": "South Sudan",  "region": "사하라이남 아프리카","income_level": "최빈개도국",  "population": 11381000,  "gdp_per_capita": 389,   "hdi": 0.381},
    "짐바브웨":   {"id": "짐바브웨",   "name_en": "Zimbabwe",     "region": "사하라이남 아프리카","income_level": "최빈개도국",  "population": 15092171,  "gdp_per_capita": 1163,  "hdi": 0.593},
    "수단":       {"id": "수단",       "name_en": "Sudan",        "region": "사하라이남 아프리카","income_level": "최빈개도국",  "population": 46874204,  "gdp_per_capita": 792,   "hdi": 0.508},
    "말라위":     {"id": "말라위",     "name_en": "Malawi",       "region": "사하라이남 아프리카","income_level": "최빈개도국",  "population": 19889742,  "gdp_per_capita": 643,   "hdi": 0.508},
    "카메룬":     {"id": "카메룬",     "name_en": "Cameroon",     "region": "사하라이남 아프리카","income_level": "최빈개도국",  "population": 27914536,  "gdp_per_capita": 1671,  "hdi": 0.576},
    "코트디부아르":{"id":"코트디부아르","name_en":"Côte d'Ivoire", "region": "사하라이남 아프리카","income_level": "중하위소득국","population": 27053756,  "gdp_per_capita": 2549,  "hdi": 0.550},
    "기니":       {"id": "기니",       "name_en": "Guinea",       "region": "사하라이남 아프리카","income_level": "최빈개도국",  "population": 13531906,  "gdp_per_capita": 1108,  "hdi": 0.465},
    "앙골라":     {"id": "앙골라",     "name_en": "Angola",       "region": "사하라이남 아프리카","income_level": "중하위소득국","population": 34503774,  "gdp_per_capita": 2033,  "hdi": 0.586},
    # ── 중동·북아프리카 ──
    "이집트":     {"id": "이집트",     "name_en": "Egypt",        "region": "중동·북아프리카",  "income_level": "중하위소득국", "population": 104258327, "gdp_per_capita": 3549,  "hdi": 0.728},
    "팔레스타인": {"id": "팔레스타인", "name_en": "Palestine",    "region": "중동",             "income_level": "중하위소득국", "population": 5227193,   "gdp_per_capita": 3389,  "hdi": 0.715},
    "모로코":     {"id": "모로코",     "name_en": "Morocco",      "region": "중동·북아프리카",  "income_level": "중하위소득국", "population": 37344795,  "gdp_per_capita": 3399,  "hdi": 0.683},
    "요르단":     {"id": "요르단",     "name_en": "Jordan",       "region": "중동",             "income_level": "중상위소득국", "population": 10203134,  "gdp_per_capita": 4479,  "hdi": 0.729},
    "이라크":     {"id": "이라크",     "name_en": "Iraq",         "region": "중동",             "income_level": "중상위소득국", "population": 41179350,  "gdp_per_capita": 5878,  "hdi": 0.686},
    "튀니지":     {"id": "튀니지",     "name_en": "Tunisia",      "region": "중동·북아프리카",  "income_level": "중하위소득국", "population": 11818619,  "gdp_per_capita": 3842,  "hdi": 0.740},
    "알제리":     {"id": "알제리",     "name_en": "Algeria",      "region": "중동·북아프리카",  "income_level": "중상위소득국", "population": 44903225,  "gdp_per_capita": 3765,  "hdi": 0.745},
    "레바논":     {"id": "레바논",     "name_en": "Lebanon",      "region": "중동",             "income_level": "중상위소득국", "population": 5489739,   "gdp_per_capita": 4130,  "hdi": 0.706},
    # ── 중남미 ──
    "에콰도르":   {"id": "에콰도르",   "name_en": "Ecuador",      "region": "중남미",           "income_level": "중상위소득국", "population": 18001000,  "gdp_per_capita": 6099,  "hdi": 0.765},
    "볼리비아":   {"id": "볼리비아",   "name_en": "Bolivia",      "region": "중남미",           "income_level": "중하위소득국", "population": 11832940,  "gdp_per_capita": 3539,  "hdi": 0.698},
    "페루":       {"id": "페루",       "name_en": "Peru",         "region": "중남미",           "income_level": "중상위소득국", "population": 33304000,  "gdp_per_capita": 7055,  "hdi": 0.762},
    "콜롬비아":   {"id": "콜롬비아",   "name_en": "Colombia",     "region": "중남미",           "income_level": "중상위소득국", "population": 51874024,  "gdp_per_capita": 6104,  "hdi": 0.758},
    "과테말라":   {"id": "과테말라",   "name_en": "Guatemala",    "region": "중남미",           "income_level": "중상위소득국", "population": 17109746,  "gdp_per_capita": 4734,  "hdi": 0.627},
    "온두라스":   {"id": "온두라스",   "name_en": "Honduras",     "region": "중남미",           "income_level": "중하위소득국", "population": 10278345,  "gdp_per_capita": 2799,  "hdi": 0.621},
    "니카라과":   {"id": "니카라과",   "name_en": "Nicaragua",    "region": "중남미",           "income_level": "중하위소득국", "population": 6948392,   "gdp_per_capita": 2186,  "hdi": 0.667},
    "파라과이":   {"id": "파라과이",   "name_en": "Paraguay",     "region": "중남미",           "income_level": "중상위소득국", "population": 7353038,   "gdp_per_capita": 5879,  "hdi": 0.717},
    "엘살바도르": {"id": "엘살바도르", "name_en": "El Salvador",  "region": "중남미",           "income_level": "중하위소득국", "population": 6336392,   "gdp_per_capita": 4875,  "hdi": 0.675},
    "아이티":     {"id": "아이티",     "name_en": "Haiti",        "region": "중남미",           "income_level": "최빈개도국",   "population": 11447569,  "gdp_per_capita": 1668,  "hdi": 0.535},
    # ── 태평양 ──
    "파푸아뉴기니":{"id":"파푸아뉴기니","name_en":"Papua New Guinea","region":"태평양",          "income_level": "최빈개도국",   "population": 9908523,   "gdp_per_capita": 2749,  "hdi": 0.558},
    "피지":        {"id": "피지",       "name_en": "Fiji",           "region": "태평양",          "income_level": "중상위소득국", "population": 930000,    "gdp_per_capita": 5460,  "hdi": 0.730},
    "솔로몬군도":  {"id": "솔로몬군도", "name_en": "Solomon Islands","region": "태평양",          "income_level": "최빈개도국",   "population": 724000,    "gdp_per_capita": 2262,  "hdi": 0.567},
    # ── 아프리카 (추가) ──
    "콩고 민주공화국":{"id":"콩고 민주공화국","name_en":"Democratic Republic of the Congo","region":"사하라이남 아프리카","income_level":"최빈개도국","population":99010212,"gdp_per_capita":557,"hdi":0.479},
    # ── 동아시아 (추가) ──
    "중국":        {"id": "중국",       "name_en": "China",          "region": "동아시아",         "income_level": "중상위소득국", "population": 1412175000,"gdp_per_capita": 12556, "hdi": 0.788},
    # ── 중남미 (추가) ──
    "도미니카공화국":{"id":"도미니카공화국","name_en":"Dominican Republic","region":"중남미",      "income_level": "중상위소득국", "population": 11117873,  "gdp_per_capita": 9785,  "hdi": 0.767},
    "코스타리카":  {"id": "코스타리카", "name_en": "Costa Rica",     "region": "중남미",           "income_level": "중상위소득국", "population": 5153957,   "gdp_per_capita": 12614, "hdi": 0.806},
}


def get_meta(ko_name: str) -> dict | None:
    return COUNTRY_META.get(ko_name)


def search_meta(query: str, limit: int = 10) -> list[dict]:
    q = query.strip()
    if not q:
        return []
    results = []
    for ko, meta in COUNTRY_META.items():
        if q in ko or q.lower() in meta["name_en"].lower():
            results.append({"name": ko, **meta})
    return results[:limit]


def all_ko_names() -> list[str]:
    return list(COUNTRY_META.keys())
