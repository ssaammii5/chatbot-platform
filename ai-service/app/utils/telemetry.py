"""
ai-service/app/utils/telemetry.py
===================================
Token counting and usage telemetry helpers.
Reports token usage back to the NestJS analytics endpoint after each RAG query
or document embedding operation, enabling billing metering per tenant.
"""
import logging
from typing import Optional

import requests

from app.core.config import settings

logger = logging.getLogger(__name__)

# ─── Token Counting ───────────────────────────────────────────────────────────


def get_token_counter():
    """
    Create a LlamaIndex TokenCountingHandler that tracks LLM + embedding token usage.
    Attach this to LlamaSettings.callback_manager before running any query.
    """
    from llama_index.core.callbacks import CallbackManager, TokenCountingHandler

    token_counter = TokenCountingHandler()
    callback_manager = CallbackManager([token_counter])
    return token_counter, callback_manager


def extract_token_counts(token_counter) -> dict:
    """
    Extract a summary of token usage from a TokenCountingHandler.
    Returns a dict with llm_tokens, embedding_tokens, and total_tokens.
    """
    try:
        return {
            "llm_tokens": getattr(token_counter, "total_llm_token_count", 0),
            "embedding_tokens": getattr(token_counter, "total_embedding_token_count", 0),
            "total_tokens": (
                getattr(token_counter, "total_llm_token_count", 0)
                + getattr(token_counter, "total_embedding_token_count", 0)
            ),
        }
    except Exception as e:
        logger.warning(f"Failed to extract token counts: {e}")
        return {"llm_tokens": 0, "embedding_tokens": 0, "total_tokens": 0}


# ─── Usage Reporting ──────────────────────────────────────────────────────────


def report_usage(
    tenant_id: str,
    tokens: int,
    model: str,
    action: str,
    conversation_id: Optional[str] = None,
    ttft_ms: Optional[int] = None,
    total_latency_ms: Optional[int] = None,
) -> None:
    """
    POST token usage to the NestJS backend analytics endpoint.
    This is called as a background task after each RAG query or embedding job
    so it does not block the response stream.

    NestJS stores this in the token_usage table for billing metering.
    """
    if tokens <= 0:
        return

    payload = {
        "tenantId": tenant_id,
        "tokens": tokens,
        "model": model,
        "action": action,
    }
    if conversation_id:
        payload["conversationId"] = conversation_id
    if ttft_ms is not None:
        payload["ttftMs"] = ttft_ms
    if total_latency_ms is not None:
        payload["totalLatencyMs"] = total_latency_ms

    try:
        response = requests.post(
            f"{settings.NESTJS_API_URL}/analytics/report",
            json=payload,
            timeout=5,
            headers={"X-Internal-API-Key": settings.INTERNAL_API_KEY or ""},
        )
        if not response.ok:
            logger.warning(
                f"NestJS analytics endpoint returned {response.status_code} "
                f"for tenant {tenant_id}"
            )
    except requests.exceptions.ConnectionError:
        # Non-fatal — usage may be lost if NestJS is temporarily unavailable
        logger.warning(
            f"Could not connect to NestJS to report usage for tenant {tenant_id}. "
            "Metering data may be incomplete."
        )
    except requests.exceptions.Timeout:
        logger.warning(
            f"Timeout reporting usage for tenant {tenant_id}. "
            "Metering data may be incomplete."
        )
    except Exception as e:
        logger.error(f"Unexpected error reporting usage: {e}")


def report_rag_usage(
    tenant_id: str,
    token_counter,
    conversation_id: Optional[str] = None,
) -> None:
    """
    Convenience wrapper for reporting usage after a RAG query.
    Reads counts from the token counter and fires a background report.
    """
    counts = extract_token_counts(token_counter)
    total = counts["total_tokens"]
    report_usage(
        tenant_id=tenant_id,
        tokens=total,
        model=settings.AI_CHAT_MODEL,
        action="rag_query",
        conversation_id=conversation_id,
    )


def report_embedding_usage(
    tenant_id: str,
    token_count: int,
    knowledge_base_id: Optional[str] = None,
) -> None:
    """
    Report token usage after a document embedding operation.
    token_count is an approximation (actual embedding tokens vary by model).
    """
    report_usage(
        tenant_id=tenant_id,
        tokens=token_count,
        model=settings.AI_EMBEDDING_MODEL,
        action="embedding",
    )
