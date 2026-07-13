import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import countries, oda, ai, diplomacy, safety, simulation, global_stats, report, market, images
from security import SecurityMiddleware

app = FastAPI(
    title="DiplomAI API",
    description="공공외교·ODA 사업 설계 AI 코파일럿",
    version="0.2.0",
)

# 배포 시 ALLOWED_ORIGINS=https://<vercel-domain> 을 쉼표 구분으로 지정
_origins = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# 요청 제한 + 보안 응답 헤더 (외부 공개 배포 대비)
app.add_middleware(SecurityMiddleware)

app.include_router(countries.router)
app.include_router(oda.router)
app.include_router(ai.router)
app.include_router(diplomacy.router)
app.include_router(safety.router)
app.include_router(simulation.router)
app.include_router(global_stats.router)
app.include_router(report.router)
app.include_router(market.router)
app.include_router(images.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "DiplomAI API v0.1.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}
