"""
ai-service/app/embeddings/service.py
=====================================
Embedding generation utilities — isolates the embedding model from the RAG engine.
Provides a single place to swap embedding providers (OpenAI, Cohere, local, etc.)
"""
import logging
from typing import List

from llama_index.embeddings.openai import OpenAIEmbedding
from app.core.config import settings

logger = logging.getLogger(__name__)


def get_embedding_model():
    """
    Return the configured LlamaIndex embedding model instance.
    This is the single source of truth for the embedding model —
    both the RAG engine and standalone embedding calls use this function.
    """
    provider = settings.AI_PROVIDER.lower()

    if provider == "openai":
        return OpenAIEmbedding(
            model=settings.AI_EMBEDDING_MODEL,
            api_key=settings.AI_API_KEY or "sk-invalid",
        )
    elif provider == "gemini":
        from llama_index.embeddings.gemini import GeminiEmbedding
        return GeminiEmbedding(
            model_name=settings.AI_EMBEDDING_MODEL,
            api_key=settings.AI_API_KEY,
        )
    elif provider == "anthropic":
        logger.warning(
            "Anthropic does not provide a native embedding API. Falling back to OpenAI for embeddings. "
            "Ensure you have an OpenAI API key configured if you intend to use RAG."
        )
        return OpenAIEmbedding(
            model=settings.AI_EMBEDDING_MODEL,
            api_key=settings.AI_API_KEY or "sk-invalid",
        )

    logger.warning(
        f"Unknown embedding provider '{provider}', falling back to OpenAI."
    )
    return OpenAIEmbedding(
        model=settings.AI_EMBEDDING_MODEL,
        api_key=settings.AI_API_KEY or "sk-invalid",
    )


def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for a list of text strings using the configured model.
    Returns a list of float vectors (one per input text).

    Used directly by knowledge ingestion outside of LlamaIndex's automatic pipeline.
    """
    model = get_embedding_model()
    embeddings = []
    for text in texts:
        try:
            embedding = model.get_text_embedding(text)
            embeddings.append(embedding)
        except Exception as e:
            logger.error(f"Failed to embed text chunk: {e}")
            # Return a zero vector of the expected dimension so the pipeline can continue
            embeddings.append([0.0] * 1536)
    return embeddings


def embed_query(query: str) -> List[float]:
    """
    Generate an embedding for a single query string.
    Used for standalone similarity-search calls outside the full RAG pipeline.
    """
    model = get_embedding_model()
    try:
        return model.get_query_embedding(query)
    except Exception as e:
        logger.error(f"Failed to embed query: {e}")
        return [0.0] * 1536
