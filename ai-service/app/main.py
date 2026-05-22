import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.api import endpoints
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Chatbot Platform AI Service",
    description="RAG & LLM orchestration microservice",
    version="1.0.0",
)

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


app.include_router(endpoints.router)


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
    }


@app.on_event("startup")
async def startup_event():
    logger.info(f"AI Service starting with provider: {settings.AI_PROVIDER}")
    logger.info(f"Chat model: {settings.AI_CHAT_MODEL}")
    if not settings.AI_API_KEY or settings.AI_API_KEY.startswith("sk-demo"):
        logger.warning(
            "⚠️  No valid AI API key configured. "
            "RAG queries will fall back to handoff mode. "
            "Set AI_API_KEY in your .env file."
        )
