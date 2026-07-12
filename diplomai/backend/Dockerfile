# DiplomAI 백엔드 — Google Cloud Run 용 컨테이너
FROM python:3.13-slim

WORKDIR /app

# 의존성 먼저 설치 (레이어 캐시)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 앱 + 데이터(CSV·HWP 등) 복사
COPY . .

# Cloud Run은 $PORT(기본 8080)로 요청을 보냄
ENV PORT=8080

# 셸 폼으로 $PORT 확장
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT}
