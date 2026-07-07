"""
보안 미들웨어 (외부 의존성 없음)
- 요청 제한: AI 엔드포인트(Claude 호출 비용) 분당 20회, 일반 API 분당 240회 (IP당)
  · AI 경로 = 추천/진단/진출가이드(/api/ai/*), 보고서·계획서(/api/report/*), 시뮬레이션 분석
- 보안 응답 헤더 (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
"""

import time
from collections import defaultdict, deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

WINDOW_SEC = 60.0
AI_LIMIT = 20        # Claude API를 호출하는 경로 (비용·남용 방지, 시연 여유 포함)
GENERAL_LIMIT = 240  # 그 외 API (국가 선택 시 병렬 호출이 많아 여유 있게)

# Claude API를 호출하는 경로 — /api/ai/ 는 recommend·evaluate·entry-guide 전부 포함
AI_PREFIXES = ("/api/ai/", "/api/report/", "/api/simulation/ai-analyze")

_hits: dict[str, deque] = defaultdict(deque)
_MAX_TRACKED_KEYS = 10_000


def _client_ip(request: Request) -> str:
    # Render/Vercel 등 프록시 뒤에서는 X-Forwarded-For의 첫 IP가 실제 클라이언트
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _allow(key: str, limit: int) -> bool:
    now = time.time()
    q = _hits[key]
    while q and now - q[0] > WINDOW_SEC:
        q.popleft()
    if len(q) >= limit:
        return False
    q.append(now)
    # 키 수 상한 — 오래 비어 있는 키 정리로 메모리 성장 방지
    if len(_hits) > _MAX_TRACKED_KEYS:
        for k in [k for k, v in _hits.items() if not v][: len(_hits) - _MAX_TRACKED_KEYS]:
            _hits.pop(k, None)
    return True


class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if path.startswith("/api/"):
            ip = _client_ip(request)
            is_ai = any(path.startswith(p) for p in AI_PREFIXES)
            bucket = "ai" if is_ai else "gen"
            limit = AI_LIMIT if is_ai else GENERAL_LIMIT
            if not _allow(f"{ip}:{bucket}", limit):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."},
                    headers={"Retry-After": "60"},
                )

        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        return response
