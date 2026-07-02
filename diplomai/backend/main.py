from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import countries, oda, ai, diplomacy, safety, simulation

app = FastAPI(
    title="DiplomAI API",
    description="ODA 분석 및 AI 사업 추천 서비스",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(countries.router)
app.include_router(oda.router)
app.include_router(ai.router)
app.include_router(diplomacy.router)
app.include_router(safety.router)
app.include_router(simulation.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "DiplomAI API v0.1.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}
