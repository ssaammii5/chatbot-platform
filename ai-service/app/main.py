import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.api import endpoints
from app.api import agent_suggestions
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Rate Limiter (per tenant_id in body, fallback to IP) ────────────────────

def _get_tenant_or_ip(request: Request) -> str:
    """
    Key function for slowapi: use tenant_id from the request body when available,
    otherwise fall back to the client IP address.
    This enables per-tenant token-rate limiting as required by the spec.
    """
    # Try to extract tenantId from the JSON body without consuming the stream
    try:
        body = request.state._body if hasattr(request.state, "_body") else None
        if body:
            import json as _json
            data = _json.loads(body)
            if "tenantId" in data:
                return f"tenant:{data['tenantId']}"
    except Exception:
        pass
    return get_remote_address(request)


limiter = Limiter(key_func=_get_tenant_or_ip)

# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Chatbot Platform AI Service",
    description="RAG & LLM orchestration microservice",
    version="1.0.0",
)

# Attach the rate limiter state and 429 handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — restrict to NestJS backend only in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # NestJS backend
        settings.NESTJS_API_URL,
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.middleware("http")
async def cache_body_middleware(request: Request, call_next):
    """
    Cache the request body so it can be read more than once.
    Required because the rate limiter key function reads the body
    before the route handler does.
    """
    body = await request.body()
    request.state._body = body

    async def receive():
        return {"type": "http.request", "body": body}

    request._receive = receive
    return await call_next(request)


@app.middleware("http")
async def internal_auth_middleware(request: Request, call_next):
    """
    Internal authentication middleware.
    Only NestJS backend and worker should call this service.
    """
    # Allow docs and health to bypass auth
    if request.url.path in ["/health", "/docs", "/openapi.json", "/redoc"]:
        return await call_next(request)

    # In production, verify internal API key from NestJS
    if settings.ENVIRONMENT == "production" and settings.INTERNAL_API_KEY:
        auth_header = request.headers.get("X-Internal-API-Key")
        if auth_header != settings.INTERNAL_API_KEY:
            return JSONResponse(
                status_code=401,
                content={"detail": "Unauthorized internal request"},
            )

    return await call_next(request)


# ─── Routers ──────────────────────────────────────────────────────────────────

app.include_router(endpoints.router)
app.include_router(agent_suggestions.router)


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "ai_provider": settings.AI_PROVIDER,
        "model": settings.AI_CHAT_MODEL,
        "has_api_key": bool(
            settings.AI_API_KEY
            and not settings.AI_API_KEY.startswith("sk-demo")
        ),
        "rate_limiting": "enabled",
    }


@app.on_event("startup")
async def startup_event():
    logger.info(f"AI Service starting with provider: {settings.AI_PROVIDER}")
    logger.info(f"Chat model: {settings.AI_CHAT_MODEL}")
    logger.info(f"Rate limiting: per-tenant, chat={settings.RATE_LIMIT_CHAT_RPM}/min, embed={settings.RATE_LIMIT_EMBED_RPM}/min")
    if not settings.AI_API_KEY or settings.AI_API_KEY.startswith("sk-demo"):
        logger.warning(
            "⚠️  No valid AI API key configured. "
            "RAG queries will fall back to handoff mode. "
            "Set AI_API_KEY in your .env file."
        )
