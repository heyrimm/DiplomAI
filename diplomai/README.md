# DiplomAI

외교부·KOICA 공공데이터 기반 국가별 ODA 분석 + AI 사업 추천 웹서비스 MVP

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
# .env 파일을 열어 ANTHROPIC_API_KEY 입력

# 서버 실행
uvicorn main:app --reload --port 8000
```

API 문서: http://localhost:8000/docs

### 2. 프론트엔드 (Next.js)

```bash
cd diplomai/frontend

# 패키지 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저: http://localhost:3000

## 기능

| 기능 | 설명 |
|------|------|
| 국가 선택 | 인도네시아 / 베트남 / 캄보디아 / 에티오피아 |
| ODA 예산 차트 | 분야별 예산 바차트 (Recharts) |
| 사각지대 경고 | 지역평균 대비 30% 이하 분야 자동 감지 |
| AI 추천 | Claude API 기반 맞춤형 신규 사업 3건 추천 |

## API 엔드포인트

```
GET  /api/countries/              국가 목록
GET  /api/countries/{id}          국가 상세
GET  /api/oda/{id}/budget         분야별 ODA 예산
GET  /api/oda/{id}/gaps           ODA 사각지대 분석
POST /api/ai/recommend            AI 사업 추천 생성
```

## 구조

```
diplomai/
  backend/
    main.py              FastAPI 앱
    requirements.txt
    .env.example
    data/
      mock_data.py       KOICA 샘플 데이터 (CSV 교체 예정)
    routers/
      countries.py
      oda.py
      ai.py
  frontend/
    src/
      app/
        page.tsx         메인 페이지
        layout.tsx
      components/
        CountrySelector.tsx
        OdaBudgetChart.tsx
        OdaGapBanner.tsx
        AiRecommendationCards.tsx
        CountryStatCard.tsx
      lib/
        api.ts           API 클라이언트
      types/
        index.ts
```
