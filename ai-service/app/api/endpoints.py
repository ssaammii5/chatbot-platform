import asyncio
import json
import logging
import re
from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
from .models import ChatRequest, DocumentRequest
from app.core.config import settings
from app.rag.engine import query_tenant_rag, process_document

logger = logging.getLogger(__name__)
router = APIRouter()

# Input validation constants
UUID_PATTERN = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    re.IGNORECASE
)
MAX_QUERY_LENGTH = 2000


def _validate_tenant_id(tenant_id: str) -> None:
    """Validate tenant_id is a valid UUID to prevent injection."""
    if not tenant_id or not UUID_PATTERN.match(tenant_id):
        raise HTTPException(status_code=400, detail="Invalid tenant_id format")


def _validate_query(query: str) -> None:
    """Validate query length and content."""
    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    if len(query) > MAX_QUERY_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Query exceeds maximum length of {MAX_QUERY_LENGTH} characters"
        )


def report_usage_to_nestjs(
    tenant_id: str, tokens: int, model: str, action: str
):
    """Background task to report token usage to NestJS analytics endpoint."""
    import requests

    try:
        requests.post(
            f"{settings.NESTJS_API_URL}/analytics/report",
            json={
                "tenantId": tenant_id,
                "tokens": tokens,
                "model": model,
                "action": action,
            },
            timeout=5,
        )
    except Exception as e:
        logger.warning(f"Failed to report usage to NestJS: {e}")


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest, background_tasks: BackgroundTasks):
    """
    RAG-based chat endpoint with streaming.

    If the AI cannot find an answer in the knowledge base, it sends a
    JSON control line `{"requires_handoff": true}` to signal the NestJS
    gateway to initiate human agent handoff.
    """
    _validate_tenant_id(request.tenantId)
    _validate_query(request.query)

    # Run the synchronous LlamaIndex RAG query in a thread pool executor
    # to avoid blocking the FastAPI event loop under concurrent requests.
    loop = asyncio.get_event_loop()
    response_stream, token_counter, requires_handoff = await loop.run_in_executor(
        None,
        query_tenant_rag,
        request.tenantId,
        request.query,
    )

    if requires_handoff or response_stream is None:
        async def handoff_generator():
            yield json.dumps({"requires_handoff": True})

        return StreamingResponse(
            handoff_generator(), media_type="text/event-stream"
        )

    async def generator():
        try:
            for text in response_stream.response_gen:
                yield text
        except Exception as e:
            logger.error(f"Error during streaming: {e}")
            yield json.dumps({"requires_handoff": True})

        # After stream completes, report usage in background
        if token_counter:
            total_tokens = token_counter.total_llm_token_count
            model_used = settings.AI_CHAT_MODEL
            background_tasks.add_task(
                report_usage_to_nestjs,
                request.tenantId,
                total_tokens,
                model_used,
                "rag_query",
            )

    return StreamingResponse(generator(), media_type="text/event-stream")


@router.post("/documents/process")
async def process_document_endpoint(
    request: DocumentRequest, background_tasks: BackgroundTasks
):
    """Process a document: parse, chunk, embed, and store in pgvector."""
    _validate_tenant_id(request.tenantId)
    _validate_tenant_id(request.knowledgeBaseId)  # Also a UUID

    # Run synchronous document processing in executor to avoid blocking
    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(
            None,
            process_document,
            request.tenantId,
            request.knowledgeBaseId,
            request.filePath,
        )
        background_tasks.add_task(
            report_usage_to_nestjs,
            request.tenantId,
            500,  # Approximate token cost for embedding
            settings.AI_EMBEDDING_MODEL,
            "embedding",
        )
        return {
            "status": "success",
            "knowledgeBaseId": request.knowledgeBaseId,
        }
    except FileNotFoundError as e:
        logger.error(f"File not found: {e}")
        # Return generic message — don't expose internal paths
        return {"status": "error", "message": "File not found"}
    except Exception as e:
        logger.error(f"Error processing document: {e}")
        return {"status": "error", "message": "Document processing failed"}
