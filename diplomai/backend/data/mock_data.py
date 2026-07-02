"""
Mock ODA data based on KOICA public data structure.
Fields mirror actual KOICA CSV export format for easy replacement.
"""

COUNTRIES = {
    "indonesia": {
        "id": "indonesia",
        "name": "인도네시아",
        "name_en": "Indonesia",
        "region": "동남아시아",
        "income_level": "중하위소득국",
        "population": 277534122,
        "gdp_per_capita": 4788,
        "hdi": 0.705,
    },
    "vietnam": {
        "id": "vietnam",
        "name": "베트남",
        "name_en": "Vietnam",
        "region": "동남아시아",
        "income_level": "중하위소득국",
        "population": 97468029,
        "gdp_per_capita": 3694,
        "hdi": 0.703,
    },
    "cambodia": {
        "id": "cambodia",
        "name": "캄보디아",
        "name_en": "Cambodia",
        "region": "동남아시아",
        "income_level": "최빈개도국",
        "population": 16713015,
        "gdp_per_capita": 1786,
        "hdi": 0.593,
    },
    "ethiopia": {
        "id": "ethiopia",
        "name": "에티오피아",
        "name_en": "Ethiopia",
        "region": "사하라이남 아프리카",
        "income_level": "최빈개도국",
        "population": 123379924,
        "gdp_per_capita": 1020,
        "hdi": 0.492,
    },
}

# ODA budget by sector (단위: 억원), based on KOICA 2023 실적 구조
ODA_BUDGETS = {
    "indonesia": [
        {"sector": "교육", "budget": 245, "projects": 12},
        {"sector": "보건", "budget": 180, "projects": 9},
        {"sector": "농업·농촌개발", "budget": 320, "projects": 15},
        {"sector": "환경", "budget": 95, "projects": 6},
        {"sector": "거버넌스", "budget": 130, "projects": 7},
        {"sector": "산업·에너지", "budget": 210, "projects": 11},
        {"sector": "젠더", "budget": 45, "projects": 4},
        {"sector": "물·위생", "budget": 85, "projects": 5},
    ],
    "vietnam": [
        {"sector": "교육", "budget": 310, "projects": 14},
        {"sector": "보건", "budget": 220, "projects": 11},
        {"sector": "농업·농촌개발", "budget": 180, "projects": 8},
        {"sector": "환경", "budget": 145, "projects": 8},
        {"sector": "거버넌스", "budget": 200, "projects": 10},
        {"sector": "산업·에너지", "budget": 380, "projects": 18},
        {"sector": "젠더", "budget": 60, "projects": 5},
        {"sector": "물·위생", "budget": 55, "projects": 4},
    ],
    "cambodia": [
        {"sector": "교육", "budget": 190, "projects": 10},
        {"sector": "보건", "budget": 165, "projects": 9},
        {"sector": "농업·농촌개발", "budget": 140, "projects": 7},
        {"sector": "환경", "budget": 30, "projects": 3},
        {"sector": "거버넌스", "budget": 110, "projects": 6},
        {"sector": "산업·에너지", "budget": 55, "projects": 4},
        {"sector": "젠더", "budget": 25, "projects": 3},
        {"sector": "물·위생", "budget": 120, "projects": 7},
    ],
    "ethiopia": [
        {"sector": "교육", "budget": 280, "projects": 13},
        {"sector": "보건", "budget": 390, "projects": 18},
        {"sector": "농업·농촌개발", "budget": 260, "projects": 12},
        {"sector": "환경", "budget": 40, "projects": 3},
        {"sector": "거버넌스", "budget": 75, "projects": 5},
        {"sector": "산업·에너지", "budget": 50, "projects": 4},
        {"sector": "젠더", "budget": 80, "projects": 6},
        {"sector": "물·위생", "budget": 200, "projects": 10},
    ],
}

# 동남아 유사국 평균 (비교 기준)
REGIONAL_AVERAGES = {
    "southeast_asia": {
        "교육": 248,
        "보건": 188,
        "농업·농촌개발": 213,
        "환경": 90,
        "거버넌스": 147,
        "산업·에너지": 215,
        "젠더": 43,
        "물·위생": 87,
    },
    "sub_saharan_africa": {
        "교육": 265,
        "보건": 355,
        "농업·농촌개발": 230,
        "환경": 55,
        "거버넌스": 90,
        "산업·에너지": 70,
        "젠더": 95,
        "물·위생": 210,
    },
}

COUNTRY_REGION_MAP = {
    "indonesia": "southeast_asia",
    "vietnam": "southeast_asia",
    "cambodia": "southeast_asia",
    "ethiopia": "sub_saharan_africa",
}

# 유사국 비교 데이터 — KOICA 공개데이터 기준 (분야별 예산 비중 %)
# 출처: KOICA ODA 통계, 외교부 ODA 백서 2023
PEER_COMPARISON = {
    "indonesia": {
        "target": {"name": "인도네시아", "code": "ID"},
        "sector": "산업·에너지",
        "peers": [
            {"country": "인도네시아", "code": "ID", "pct": 18.5, "level": "낮음"},
            {"country": "베트남",     "code": "VN", "pct": 25.3, "level": "평균"},
            {"country": "필리핀",     "code": "PH", "pct": 22.1, "level": "평균"},
            {"country": "캄보디아",   "code": "KH", "pct": 10.2, "level": "낮음"},
            {"country": "수원국 평균","code": "AVG","pct": 22.8, "level": "평균"},
        ],
    },
    "vietnam": {
        "target": {"name": "베트남", "code": "VN"},
        "sector": "ICT·디지털",
        "peers": [
            {"country": "베트남",     "code": "VN", "pct": 21.4, "level": "평균"},
            {"country": "인도네시아", "code": "ID", "pct": 11.6, "level": "낮음"},
            {"country": "캄보디아",   "code": "KH", "pct": 18.9, "level": "평균"},
            {"country": "에티오피아", "code": "ET", "pct":  9.1, "level": "낮음"},
            {"country": "수원국 평균","code": "AVG","pct": 19.7, "level": "평균"},
        ],
    },
    "cambodia": {
        "target": {"name": "캄보디아", "code": "KH"},
        "sector": "산업·에너지",
        "peers": [
            {"country": "캄보디아",   "code": "KH", "pct": 10.2, "level": "낮음"},
            {"country": "베트남",     "code": "VN", "pct": 25.3, "level": "평균"},
            {"country": "미얀마",     "code": "MM", "pct": 19.8, "level": "평균"},
            {"country": "라오스",     "code": "LA", "pct": 16.4, "level": "평균"},
            {"country": "수원국 평균","code": "AVG","pct": 21.5, "level": "평균"},
        ],
    },
    "ethiopia": {
        "target": {"name": "에티오피아", "code": "ET"},
        "sector": "환경·기후",
        "peers": [
            {"country": "에티오피아", "code": "ET", "pct":  5.8, "level": "낮음"},
            {"country": "케냐",       "code": "KE", "pct": 14.2, "level": "평균"},
            {"country": "탄자니아",   "code": "TZ", "pct": 11.6, "level": "평균"},
            {"country": "르완다",     "code": "RW", "pct": 17.3, "level": "높음"},
            {"country": "수원국 평균","code": "AVG","pct": 13.1, "level": "평균"},
        ],
    },
}

# 국가별 공공외교 데이터 — KF(한국국제교류재단) 통계, 한국문화원 현황
# 출처: KF 공공외교 통계센터 2023, 세종학당재단 연차보고서
PUBLIC_DIPLOMACY = {
    "indonesia": {
        "kf_index": 71,
        "korean_learners": 142000,
        "tourists": 480000,
        "learners_yoy": 34,
        "tourists_yoy": 18,
        "rank_in_region": "동남아 국가 중 2위",
        "channels": [
            {"label": "한국어 교육",   "score": 88},
            {"label": "문화 교류",     "score": 74},
            {"label": "미디어·콘텐츠", "score": 71},
            {"label": "학술 교류",     "score": 55},
            {"label": "경제 협력",     "score": 38},
        ],
        "trends": [
            {"label": "세종학당 수강생",  "value": "+41%"},
            {"label": "K-드라마 시청률", "value": "+29%"},
            {"label": "한국 유학생",     "value": "+22%"},
            {"label": "한국 직접 투자",  "value": "+7%"},
            {"label": "문화 이벤트 참가","value": "+53%"},
        ],
        "timeline": [
            {"year": "2018", "event": "자카르타 한국문화원 설치",     "detail": "이후 한국어 학습자 250% 증가",  "tag": "문화원"},
            {"year": "2020", "event": "세종학당 3개소 신설",          "detail": "수리바야·반둥·메단 거점 확대",  "tag": "세종학당"},
            {"year": "2022", "event": "한-인니 디지털 파트너십 체결", "detail": "ICT 분야 협력 강화 선언",       "tag": "협력"},
            {"year": "2024", "event": "K-콘텐츠 현지화 사업 착수",   "detail": "OTT 기반 한류 확산 전략",       "tag": "한류"},
        ],
        "ai_insight": "문화원 설치(2018) 이후 한국어 학습자 수 250% 증가. 단, 문화교류 지수 대비 경제협력 지수는 아직 낮음(38점). K-pop·드라마 관심도 급증 대비 실질 투자 유치로의 전환 전략 필요.",
    },
    "vietnam": {
        "kf_index": 68,
        "korean_learners": 215000,
        "tourists": 520000,
        "learners_yoy": 28,
        "tourists_yoy": 22,
        "rank_in_region": "동남아 국가 중 1위",
        "channels": [
            {"label": "한국어 교육",   "score": 92},
            {"label": "경제 협력",     "score": 85},
            {"label": "문화 교류",     "score": 70},
            {"label": "학술 교류",     "score": 63},
            {"label": "미디어·콘텐츠", "score": 58},
        ],
        "trends": [
            {"label": "한국어 학습자",   "value": "+28%"},
            {"label": "한국 기업 진출",  "value": "+15%"},
            {"label": "K-드라마 시청률", "value": "+35%"},
            {"label": "한국 유학생",     "value": "+19%"},
            {"label": "관광객",         "value": "+22%"},
        ],
        "timeline": [
            {"year": "2016", "event": "하노이 한국문화원 확장",        "detail": "재건축 후 규모 3배 확대",        "tag": "문화원"},
            {"year": "2019", "event": "세종학당 5개소 운영",           "detail": "전국 주요 도시 거점화",          "tag": "세종학당"},
            {"year": "2021", "event": "한-베 수교 30주년 문화행사",    "detail": "양국 공동 콘텐츠 제작",          "tag": "협력"},
            {"year": "2023", "event": "K-뷰티 산업 협력 MOU",         "detail": "화장품·패션 현지화 지원",        "tag": "산업"},
        ],
        "ai_insight": "베트남은 한국 최대 ODA 수원국이자 교역국. 경제협력 지수(85점)가 높으나 문화·미디어 분야 협력이 상대적으로 낮아 소프트파워 연계 전략 강화 필요.",
    },
    "cambodia": {
        "kf_index": 52,
        "korean_learners": 38000,
        "tourists": 95000,
        "learners_yoy": 19,
        "tourists_yoy": 12,
        "rank_in_region": "동남아 국가 중 4위",
        "channels": [
            {"label": "한국어 교육",   "score": 62},
            {"label": "문화 교류",     "score": 55},
            {"label": "학술 교류",     "score": 48},
            {"label": "미디어·콘텐츠", "score": 44},
            {"label": "경제 협력",     "score": 32},
        ],
        "trends": [
            {"label": "한국어 학습자",   "value": "+19%"},
            {"label": "K-드라마 시청률", "value": "+41%"},
            {"label": "한국 유학생",     "value": "+8%"},
            {"label": "봉사단 파견",     "value": "+5%"},
            {"label": "문화 이벤트",    "value": "+27%"},
        ],
        "timeline": [
            {"year": "2014", "event": "프놈펜 세종학당 설립",         "detail": "첫 해 수강생 400명",            "tag": "세종학당"},
            {"year": "2018", "event": "캄보디아 한국문화원 개원",     "detail": "동남아 6번째 문화원",           "tag": "문화원"},
            {"year": "2021", "event": "KOICA-KF 연계 사업 시작",     "detail": "ODA·공공외교 통합 접근",       "tag": "협력"},
            {"year": "2023", "event": "K-콘텐츠 페스티벌 개최",      "detail": "관람객 1만 2천명",             "tag": "한류"},
        ],
        "ai_insight": "캄보디아는 공공외교 지수(52점)가 지역 평균 대비 낮으나 K-드라마 관심도 급증(+41%)이 확인됨. ODA 사업과 한국어 교육 연계를 통한 소프트파워 확대 여지가 큼.",
    },
    "ethiopia": {
        "kf_index": 38,
        "korean_learners": 12000,
        "tourists": 8500,
        "learners_yoy": 42,
        "tourists_yoy": 5,
        "rank_in_region": "아프리카 국가 중 3위",
        "channels": [
            {"label": "한국어 교육",   "score": 45},
            {"label": "학술 교류",     "score": "40"},
            {"label": "문화 교류",     "score": 35},
            {"label": "경제 협력",     "score": 28},
            {"label": "미디어·콘텐츠", "score": 22},
        ],
        "trends": [
            {"label": "한국어 학습자",  "value": "+42%"},
            {"label": "장학생 파견",    "value": "+18%"},
            {"label": "봉사단",        "value": "+12%"},
            {"label": "한국 기업",     "value": "+3%"},
            {"label": "문화 행사",     "value": "+31%"},
        ],
        "timeline": [
            {"year": "2010", "event": "아디스아바바 KOICA 사무소 확장","detail": "ODA 사업 본격화",              "tag": "KOICA"},
            {"year": "2017", "event": "에티오피아 세종학당 설립",      "detail": "아프리카 첫 세종학당 중 하나", "tag": "세종학당"},
            {"year": "2020", "event": "한-에티오피아 외교 50주년",     "detail": "문화협력 확대 선언",           "tag": "협력"},
            {"year": "2023", "event": "K-컬처 아프리카 투어",          "detail": "아디스아바바 K-pop 공연",      "tag": "한류"},
        ],
        "ai_insight": "에티오피아는 한국어 학습자 증가율(+42%)이 가장 높으나 절대 규모(1.2만명)는 작음. ODA와 연계한 장학 프로그램 확대로 미래 친한(親韓) 인재 기반 구축 전략이 유효.",
    },
}

MOCK_RECOMMENDATIONS = {
    "indonesia": [
        {
            "title": "수마트라 농촌 스마트팜 구축",
            "sector": "농업·농촌개발",
            "budget_estimate": "85억원",
            "duration": "4년",
            "rationale": "인도네시아는 농업 분야에 320억원을 투자하고 있으나 ICT 접목 사업 비중이 낮습니다. 수마트라 농촌 지역의 소농 생산성은 지역평균 대비 40% 낮아 스마트팜 기술 도입 효과가 클 것으로 예상됩니다.",
            "expected_impact": "농가 소득 30% 향상 및 식량 자급률 개선, 청년 농업인 유입 촉진.",
            "priority": "high",
        },
        {
            "title": "자카르타 대기질 모니터링 시스템",
            "sector": "환경",
            "budget_estimate": "40억원",
            "duration": "3년",
            "rationale": "환경 분야 예산(95억원)이 지역평균 대비 낮고, 자카르타는 세계 최악의 대기오염 도시 중 하나입니다. 한국의 에어코리아 시스템 수출 및 기술이전 형태로 추진 가능합니다.",
            "expected_impact": "실시간 대기질 데이터 기반 정책 수립 지원, 시민 건강 피해 비용 연 2천억원 절감 기여.",
            "priority": "medium",
        },
        {
            "title": "여성 직업훈련 및 창업 지원",
            "sector": "젠더",
            "budget_estimate": "25억원",
            "duration": "3년",
            "rationale": "젠더 분야 예산(45억원)이 지역평균 수준이나 여성 경제활동 참가율이 54%로 낮습니다. 디지털 기술 교육과 소액금융 연계 창업 지원을 결합한 통합 모델이 필요합니다.",
            "expected_impact": "여성 창업자 3,000명 육성, 참여 여성 소득 평균 45% 향상.",
            "priority": "medium",
        },
    ],
    "vietnam": [
        {
            "title": "메콩강 유역 기후변화 적응 사업",
            "sector": "환경",
            "budget_estimate": "60억원",
            "duration": "4년",
            "rationale": "메콩강 삼각주는 해수면 상승과 염수 침입으로 연간 농경지 손실이 심각합니다. 환경 분야 예산(145억원)이 지역평균 수준이나 기후적응 특화 사업이 부족합니다.",
            "expected_impact": "농경지 20만 헥타르 보호 및 삼각주 주민 50만 명 생계 안정 기여.",
            "priority": "high",
        },
        {
            "title": "하노이·호치민 직업기술교육 혁신",
            "sector": "교육",
            "budget_estimate": "95억원",
            "duration": "5년",
            "rationale": "베트남 제조업 고도화에 따라 숙련 기술인력 수요가 급증하고 있습니다. 한국 직업훈련원(HRD Korea) 협업으로 반도체·자동차 분야 맞춤형 커리큘럼을 구축할 수 있습니다.",
            "expected_impact": "기술인력 1만 명 양성, 취업률 80% 이상 달성 및 평균 임금 35% 향상.",
            "priority": "high",
        },
        {
            "title": "농촌 여성 디지털 금융 접근성 확대",
            "sector": "젠더",
            "budget_estimate": "30억원",
            "duration": "3년",
            "rationale": "젠더 예산(60억원)이 지역평균을 소폭 상회하나 농촌 여성의 금융 서비스 접근성은 여전히 낮습니다. 모바일 금융과 협동조합 모델을 결합한 한국형 새마을금고 사업 적용이 적합합니다.",
            "expected_impact": "농촌 여성 5만 명 금융 계좌 개설 및 소액대출 지원, 여성 창업 2,000건 달성.",
            "priority": "medium",
        },
    ],
    "cambodia": [
        {
            "title": "프놈펜 디지털 직업교육 센터",
            "sector": "산업·에너지",
            "budget_estimate": "65억원",
            "duration": "4년",
            "sdg": ["SDG 4", "SDG 8"],
            "rationale": (
                "산업·에너지 분야 예산(55억원)이 지역평균(215억원)의 26%로 4개 대상국 중 최대 사각지대입니다. "
                "캄보디아 청년 실업률 18.3%(ILO 2023)와 ICT 산업 연 22% 성장을 고려하면 "
                "디지털 직업훈련 수요가 명확합니다. 유사 사례인 베트남 ICT 직업교육 사업(2019–2023)은 "
                "청년 취업률 3.8%p 개선, 여성 수강생 44% 달성 사례가 있어 캄보디아 적용 가능성이 높습니다."
            ),
            "expected_impact": "디지털 기술 인력 연 2,500명 배출, 청년 취업률 4.2%p 향상, ICT 분야 여성 취업자 비율 40% 목표.",
            "priority": "high",
        },
        {
            "title": "통레삽 호수 기후적응 생태복원",
            "sector": "환경",
            "budget_estimate": "42억원",
            "duration": "3년",
            "sdg": ["SDG 13", "SDG 14", "SDG 1"],
            "rationale": (
                "환경 분야 예산(30억원)이 지역평균(90억원)의 33%로 심각하게 낮습니다. "
                "동남아 최대 담수호 통레삽은 기후변화로 건기 수위가 40년 최저치를 기록하며 "
                "어업 의존 인구 300만 명의 생계를 위협하고 있습니다. "
                "KOICA 메콩강 유역 환경사업(2021–2024) 경험을 캄보디아로 확장 적용할 수 있습니다."
            ),
            "expected_impact": "호수 수질지수 35% 개선, 어획량 연 15% 회복, 어업 가구 소득 20% 향상, 탄소흡수원 2만 헥타르 복원.",
            "priority": "high",
        },
        {
            "title": "농촌 여성 경제역량 강화 사업",
            "sector": "젠더",
            "budget_estimate": "28억원",
            "duration": "3년",
            "sdg": ["SDG 5", "SDG 8", "SDG 10"],
            "rationale": (
                "젠더 예산(25억원)이 지역평균(43억원)의 58%로 미흡합니다. "
                "캄보디아 농촌 여성의 비공식 경제 종사 비율이 78%에 달하나 금융 서비스 접근성은 "
                "도시 대비 31%p 낮습니다. KF 공공외교 지수 52점을 고려하면 "
                "여성 역량강화 사업이 ODA·공공외교 연계 효과도 기대됩니다."
            ),
            "expected_impact": "농촌 여성 4,000명 금융·디지털 역량 교육 이수, 소액창업 지원 1,200건, 수혜 여성 평균 소득 38% 향상.",
            "priority": "medium",
        },
    ],
    "ethiopia": [
        {
            "title": "에티오피아 소규모 관개농업 현대화",
            "sector": "농업·농촌개발",
            "budget_estimate": "110억원",
            "duration": "5년",
            "rationale": "농업·농촌개발 예산(260억원)이 지역평균(230억원) 수준이나 기후변화로 인한 가뭄 반복으로 식량불안이 심화되고 있습니다. 태양열 펌프 기반 소규모 관개시스템 보급이 시급합니다.",
            "expected_impact": "관개면적 15만 헥타르 확대, 농업 생산성 50% 향상으로 400만 명 식량안보 기여.",
            "priority": "high",
        },
        {
            "title": "아디스아바바 1차 의료 역량강화",
            "sector": "보건",
            "budget_estimate": "75억원",
            "duration": "4년",
            "rationale": "보건 예산(390억원)이 지역평균(355억원) 대비 높으나 1차 의료시설 인력 및 장비 부족이 심각합니다. HDI 0.492로 최하위권인 만큼 기초 의료 접근성 확대가 최우선 과제입니다.",
            "expected_impact": "1차 의료 접근성 60% 향상, 예방 가능한 감염병 사망률 35% 감소.",
            "priority": "high",
        },
        {
            "title": "여성 및 소녀 교육 지원 프로그램",
            "sector": "젠더",
            "budget_estimate": "45억원",
            "duration": "4년",
            "rationale": "젠더 예산(80억원)이 지역평균(95억원)의 84%로 미흡하며, 에티오피아 농촌 여성 문맹률은 65%에 달합니다. 조혼 예방과 여학생 학교 잔류율 향상을 위한 통합 지원이 필요합니다.",
            "expected_impact": "여학생 중학교 진학률 25%p 향상, 여성 성인 문해율 40% 개선.",
            "priority": "medium",
        },
    ],
}
