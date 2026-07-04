# DiplomAI

외교부·KOICA 공공데이터 기반 국가별 ODA 분석 + AI 사업 추천 웹서비스  
2025 외교부 AI 공공데이터 활용 경진대회 출품작

---

## 빠른 시작

### 1. 백엔드 (FastAPI)

```bash
cd diplomai/backend

# 가상환경 생성 (권장)
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# 패키지 설치
pip install -r requirements.txt

# 환경변수 설정
copy .env.example .env
# .env 파일에 ANTHROPIC_API_KEY, DATA_GO_KR_API_KEY 입력

# 서버 실행
uvicorn main:app --reload --port 8000
```

API 문서: http://localhost:8000/docs

### 2. 프론트엔드 (Next.js)

```bash
cd diplomai/frontend

npm install
npm run dev
```

브라우저: http://localhost:3000

---

## 기능

| 기능 | 설명 | 데이터 출처 |
|------|------|------------|
| 글로벌 대시보드 | KOICA 지원국 Top10 · 세종학당 Top10 · 전 세계 여행경보 현황 | KOICA CSV · 세종학당 CSV · 외교부 API |
| 국가 선택 | 70개국 (동남아·남아시아·아프리카·중앙아·중동·중남미) | KOICA 협력국 목록 |
| ODA 예산 차트 | 분야별 예산 바차트 + 전년비 변화 | KOICA ODA 실적 CSV (data.go.kr) |
| 사각지대 분석 | 지역 내 국가 평균 섹터 비율 대비 30% 이하 분야 자동 감지 | KOICA 협력국 통합 개발 지표 (실계산) |
| 공공외교 현황 | 공공외교 지수 · 세종학당 수강생 · 재외동포 · 재외공관 수 | 세종학당 CSV · 재외동포 CSV · 재외공관 API |
| 여행경보 | 국가별 여행경보 단계 + 최근 발령 이력 | 외교부 여행경보 API (data.go.kr) |
| AI ODA 추천 | ODA 사업 3건 + 공공외교 강화 사업 2건 (데이터 출처 인용 포함) | Claude AI + KOICA/세종학당 실데이터 |
| ODA 시뮬레이션 | 섹터별 예산 재배분 → HDI·수혜인구·SDG 기여 실시간 추정 | KOICA 협력국 통합 개발 지표 (회귀 추정치) |
| AI 시나리오 분석 | 시뮬레이션 결과 기반 정책 효과성·리스크 분석 | Claude AI |
| 보고서 생성 | AI 종합 전략 분석 + 섹션별 보고서 생성 → Markdown 다운로드 | Claude AI + 전체 실데이터 |

---

## 활용 공공데이터

| 데이터 | 출처 | 유형 |
|--------|------|------|
| KOICA ODA 국가별 지원 실적 | data.go.kr (한국국제협력단) | CSV |
| KOICA 협력국 통합 개발 지표 | data.go.kr (한국국제협력단) | CSV |
| KOICA 사업분야별 ODA 실적통계 | data.go.kr (한국국제협력단) | CSV |
| 세종학당재단 국가별 수강생 현황 | data.go.kr (세종학당재단) | CSV |
| 외교부 재외동포 현황 | data.go.kr (외교부) | CSV |
| 재외공관 현황 (EmbassyService2) | data.go.kr (외교부) | API |
| 여행경보 현황·이력 (CountryHistoryService2) | data.go.kr (외교부) | API |

---

## API 엔드포인트

```
GET  /api/global/summary                전 세계 KOICA·세종학당·KPI 요약
GET  /api/countries/                    국가 목록 (70개국)
GET  /api/countries/{id}               국가 상세 (개발지표 포함)
GET  /api/oda/{id}/budget              분야별 ODA 예산 (KOICA 실데이터)
GET  /api/oda/{id}/gaps                ODA 사각지대 분석 (지역 평균 비율 실계산)
GET  /api/oda/{id}/history             KOICA 지원 연도별 추이
POST /api/ai/recommend                  AI 사업 추천 (ODA 3건 + 공공외교 2건)
GET  /api/diplomacy/{id}               공공외교 지수·세종학당·재외동포·재외공관
GET  /api/safety/{id}/alarm            여행경보 현황
GET  /api/safety/{id}/history          여행경보 발령 이력
GET  /api/simulation/{id}/base         시뮬레이션 기본 데이터
POST /api/simulation/ai-analyze         AI 시나리오 분석
POST /api/report/generate              AI 종합 전략 분석 보고서 생성
```

---

## 프로젝트 구조

```
diplomai/
  backend/
    main.py                  FastAPI 앱
    requirements.txt
    .env.example
    data/
      country_meta.py        70개국 메타데이터 (지역·소득·HDI 등)
      *.csv                  KOICA·세종학당·재외동포 공공데이터
    routers/
      countries.py           국가 목록·상세
      oda.py                 ODA 예산·사각지대·이력
      ai.py                  AI 사업 추천
      diplomacy.py           공공외교 지수
      safety.py              여행경보
      simulation.py          ODA 예산 시뮬레이션
      global_stats.py        전 세계 요약
      report.py              AI 보고서 생성
    services/
      koica_csv.py           KOICA ODA CSV 파서
      koica_indicators.py    협력국 개발지표 + 지역 평균 섹터 비율
      public_diplomacy.py    세종학당·재외동포·재외공관 서비스
      mofa_api.py            외교부 여행경보 API
  frontend/
    src/
      app/
        page.tsx             메인 페이지 (글로벌 대시보드 + 국가별 탭)
      components/
        GlobalDashboard.tsx  메인 글로벌 대시보드
        CountrySelector.tsx
        OdaBudgetChart.tsx
        AiRecommendationCards.tsx
        tabs/
          OdaTab.tsx
          DiplomacyTab.tsx
          SafetyTab.tsx
          SimulationTab.tsx
          ReportTab.tsx
      types/
        index.ts             공유 타입 정의
```

---

## 환경변수 (.env)

```
ANTHROPIC_API_KEY=sk-ant-...      # Claude AI API 키 (AI 추천·보고서 생성)
DATA_GO_KR_API_KEY=...            # data.go.kr API 키 (재외공관·여행경보 API)
```

`.env` 파일은 `.gitignore`에 포함되어 있습니다. 절대 커밋하지 마세요.
