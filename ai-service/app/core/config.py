import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Service"

    # Database
    DATABASE_URL: str = "postgresql://acp_user:devpassword123@localhost:5432/chatbot_platform_db"

    # Redis for rate limiting
    REDIS_URL: str = "redis://localhost:6379"

    # NestJS backend for usage reporting
    NESTJS_API_URL: str = "http://localhost:3000"

    # AI Provider configuration (vendor-neutral abstraction)
    AI_PROVIDER: str = "openai"
    AI_API_KEY: str = ""
    AI_CHAT_MODEL: str = "gpt-4o-mini"
    AI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    # RAG configuration
    RAG_TOP_K: int = 5
    RAG_MAX_TOKENS: int = 1024

    # Internal service auth
    INTERNAL_API_KEY: Optional[str] = None

    # Environment
    ENVIRONMENT: str = "development"

    # Per-tenant rate limits (requests per minute)
    # Chat: max AI queries per tenant per minute
    RATE_LIMIT_CHAT_RPM: int = 60
    # Embedding: max document embedding jobs per tenant per minute
    RATE_LIMIT_EMBED_RPM: int = 20
    # Agent suggestion: max suggestion requests per tenant per minute
    RATE_LIMIT_SUGGEST_RPM: int = 120

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
