import logging
import json
from llama_index.core import VectorStoreIndex, Document, StorageContext
from llama_index.core import Settings as LlamaSettings
from llama_index.core.callbacks import CallbackManager, TokenCountingHandler
from llama_index.embeddings.openai import OpenAIEmbedding
from app.core.config import settings
from app.llm.provider import get_llm_provider

logger = logging.getLogger(__name__)

# Setup Token Counter
token_counter = TokenCountingHandler()
LlamaSettings.callback_manager = CallbackManager([token_counter])

def configure_llama_settings():
    """Ensure LlamaIndex has the correct LLM and Embedding models."""
    provider = get_llm_provider()
    LlamaSettings.llm = provider.get_llm()
    LlamaSettings.embed_model = OpenAIEmbedding(
        model=settings.AI_EMBEDDING_MODEL,
        api_key=settings.AI_API_KEY or "sk-invalid",
    )


def get_vector_store():
    """Create a PGVector store connection for tenant-scoped embeddings."""
    from llama_index.vector_stores.postgres import PGVectorStore
    from sqlalchemy import make_url

    url = make_url(settings.DATABASE_URL)

    return PGVectorStore.from_params(
        database=url.database,
        host=url.host,
        password=url.password,
        port=url.port,
        user=url.username,
        table_name="documents_embeddings",
        embed_dim=1536,  # Default for OpenAI text-embedding-3-small
    )


def query_tenant_rag(tenant_id: str, query: str):
    """
    Query the RAG engine for a specific tenant.
    
    Returns:
        tuple: (streaming_response, token_counter, requires_handoff)
        - streaming_response is None if an error occurred
        - requires_handoff is True if the bot cannot answer from the knowledge base
    """
    try:
        # Reset token counter for this request
        token_counter.reset_counts()

        configure_llama_settings()

        vector_store = get_vector_store()

        # MUST enforce tenant isolation via Metadata Filters
        from llama_index.core.vector_stores.types import (
            MetadataFilter,
            MetadataFilters,
            FilterOperator,
        )

        filters = MetadataFilters(
            filters=[
                MetadataFilter(
                    key="tenant_id",
                    value=tenant_id,
                    operator=FilterOperator.EQ,
                )
            ]
        )

        index = VectorStoreIndex.from_vector_store(vector_store=vector_store)

        # Build the query engine with RAG constraints
        query_engine = index.as_query_engine(
            filters=filters,
            streaming=True,
            similarity_top_k=settings.RAG_TOP_K,
        )

        response = query_engine.query(query)

        # Check if the response contains meaningful content
        # If source nodes have low similarity scores, the bot should hand off
        source_nodes = getattr(response, "source_nodes", [])
        if not source_nodes or all(
            getattr(node, "score", 0) < 0.3 for node in source_nodes
        ):
            logger.info(
                f"Low confidence for tenant {tenant_id} query, flagging for handoff"
            )
            return response, token_counter, True

        return response, token_counter, False

    except Exception as e:
        logger.error(f"Error querying RAG for tenant {tenant_id}: {e}")
        # Graceful degradation — return handoff signal
        return None, None, True


def process_document(tenant_id: str, knowledge_base_id: str, file_path: str):
    """Process a document: chunk it, generate embeddings, store in pgvector."""
    from llama_index.core import SimpleDirectoryReader
    import os

    logger.info(f"Processing document for tenant {tenant_id}")

    # Security: Validate the file path stays within the uploads directory
    # to prevent path traversal attacks (e.g., ../../../../etc/passwd)
    uploads_base = os.path.realpath(
        os.path.join(os.path.dirname(__file__), '..', '..', '..', 'uploads')
    )
    resolved_path = os.path.realpath(file_path)
    # Enforce trailing separator to prevent prefix-matching bypass
    if not resolved_path.startswith(uploads_base + os.sep):
        logger.error(
            f"Path traversal attempt blocked for tenant {tenant_id}: {file_path}"
        )
        raise ValueError("Invalid file path: outside allowed upload directory")

    if not os.path.exists(resolved_path):
        raise FileNotFoundError(f"File not found")

    reader = SimpleDirectoryReader(input_files=[resolved_path])
    documents = reader.load_data()

    # Add tenant metadata for isolation during vector similarity search
    for doc in documents:
        doc.metadata["tenant_id"] = tenant_id
        doc.metadata["knowledge_base_id"] = knowledge_base_id

    configure_llama_settings()

    # Get vector store and index
    vector_store = get_vector_store()

    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    VectorStoreIndex.from_documents(
        documents,
        storage_context=storage_context,
        show_progress=True,
    )
    logger.info(f"Successfully processed and embedded document for tenant {tenant_id}")
    return True
