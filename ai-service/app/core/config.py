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

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
