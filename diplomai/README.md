# DiplomAI — 공공외교 사업 설계 AI 코파일럿

공공외교·ODA 사업 기획자가 대상국 조사부터 **사업계획서 초안**까지 걸리던 수일의 업무를,  
공공데이터 근거가 인용된 몇 분의 작업으로 바꾸는 AI 코파일럿.  
2026 외교 공공데이터·AI 활용 경진대회 출품작

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
| 분석 보고서 생성 | AI 종합 전략 분석 + 섹션별 보고서 생성 → Markdown 다운로드 | Claude AI + 전체 실데이터 |
| **사업계획서 초안 생성** | 배경–목표–대상–활동–예산–KPI–리스크 구조의 실무 문서를 AI가 작성 (사각지대·여행경보 데이터 자동 반영, AI 추천 사업 기반 구체화 지원) → Markdown 다운로드 | Claude AI + 전체 실데이터 |

---

## 활용 공공데이터

| 데이터 | 출처 | 유형 |
|--------|------|------|
| KOICA ODA 국가별 지원 실적 | data.go.kr (한국국제협력단) | CSV |
| KOICA 협력국 통합 개발 지표 | data.go.kr (한국국제협력단) | CSV |
| KOICA 사업분야별 ODA 실적통계 | data.go.kr (한국국제협력단) | CSV |
| 세종학당재단 국가별 수강생 현황 | data.go.kr (세종학당재단 · 문체부 산하) | CSV |
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
POST /api/report/generate              AI 보고서·사업계획서 초안 생성 (mode: summary | plan)
```

---

## 공공외교 지수 산식

공공외교 탭의 지수(0~100)는 아래 3개 공공데이터를 log 정규화해 가중합한 **자체 산출 지수**입니다.

| 지표 | 가중치 | 정규화 | 기준 최대값 |
|------|--------|--------|-------------|
| 세종학당 수강생 수 | 35% | log10 스케일 | 50,000명 |
| 재외동포 수 | 45% | log10 스케일 | 3,000,000명 |
| 재외공관 수 | 20% | 선형 | 5개소 |

`지수 = 0.35×세종학당점수 + 0.45×재외동포점수 + 0.20×공관점수`  
log 스케일을 쓰는 이유: 국가 간 편차가 수천 배에 달하는 인원 지표를 선형 비교하면 상위 몇 개국 외 전부 0점에 수렴하기 때문입니다. 가중치는 상시성(동포) > 학습 수요(세종학당) > 인프라(공관) 순의 채널 지속성 기준이며, 구현은 `backend/services/public_diplomacy.py`의 `compute_diplomacy_index()` 참조.

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
ANTHROPIC_API_KEY=sk-ant-...      # Claude AI API 키 (AI 추천·보고서·계획서 생성)
DATA_GO_KR_API_KEY=...            # data.go.kr API 키 (재외공관·여행경보 API)
REPORT_MODEL=...                  # (선택) 보고서 생성 모델, 기본 claude-haiku-4-5
ALLOWED_ORIGINS=...               # (선택) 배포 시 프론트 도메인 (쉼표 구분)
```

`.env` 파일은 `.gitignore`에 포함되어 있습니다. 절대 커밋하지 마세요.

---

## 배포 (Vercel + Render)

**백엔드 (Render 무료):** 저장소 루트의 `render.yaml`을 Blueprint로 연결하면 자동 설정됩니다.
대시보드에서 `ANTHROPIC_API_KEY`, `DATA_GO_KR_API_KEY`, `ALLOWED_ORIGINS`(Vercel 도메인)를 입력하세요.

**프론트엔드 (Vercel):** Root Directory를 `diplomai/frontend`로 지정하고,
환경변수 `API_URL`에 Render 백엔드 URL(예: `https://diplomai-api.onrender.com`)을 설정하세요.
API 호출은 Next.js rewrite(서버사이드 프록시)로 전달되므로 브라우저 CORS 이슈가 없습니다.

> ⚠ Render 무료 플랜은 15분 유휴 시 슬립됩니다. **시연 5분 전에 URL을 한 번 열어 웜업**하세요.
