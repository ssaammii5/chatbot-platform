"""
ai-service/app/knowledge/parser.py
====================================
Document parsing, URL crawling, and chunking utilities.
These are used by the RAG ingestion pipeline when documents are uploaded
by tenant admins. The rag/engine.py process_document function delegates
heavy parsing/splitting decisions to this module.
"""
import logging
import os
import re
from pathlib import Path
from typing import List, Optional

logger = logging.getLogger(__name__)

# ─── Constants ────────────────────────────────────────────────────────────────

# Default chunk sizes (tokens, not chars) for different document types
DEFAULT_CHUNK_SIZE = 512
DEFAULT_CHUNK_OVERLAP = 64
URL_CHUNK_SIZE = 256  # Smaller for web content, which is often noisier

# ─── File Parsing ─────────────────────────────────────────────────────────────


def load_file_as_documents(file_path: str, tenant_id: str, knowledge_base_id: str):
    """
    Load a file from disk and return a list of LlamaIndex Document objects.
    Supports: PDF, DOCX, TXT, Markdown.

    Raises ValueError on path traversal. Raises FileNotFoundError if missing.
    """
    from llama_index.core import SimpleDirectoryReader

    _validate_path(file_path)

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    reader = SimpleDirectoryReader(input_files=[file_path])
    documents = reader.load_data()

    # Attach tenant metadata for RLS-compatible vector search isolation
    for doc in documents:
        doc.metadata["tenant_id"] = tenant_id
        doc.metadata["knowledge_base_id"] = knowledge_base_id
        # Store only the filename, not the full system path, in metadata
        doc.metadata["source_filename"] = Path(file_path).name

    logger.info(
        f"Loaded {len(documents)} document(s) from {Path(file_path).name} "
        f"for tenant {tenant_id}"
    )
    return documents


def load_url_as_documents(url: str, tenant_id: str, knowledge_base_id: str):
    """
    Crawl a URL and return LlamaIndex Document objects from its text content.
    Uses BeautifulSoup for lightweight parsing if available, else falls back
    to plain requests.

    NOTE: URL crawling is a best-effort operation. Certain sites block crawlers.
    """
    try:
        from llama_index.readers.web import SimpleWebPageReader  # type: ignore
    except ImportError:
        logger.warning(
            "llama-index-readers-web not installed. Falling back to requests-based crawl."
        )
        return _crawl_url_fallback(url, tenant_id, knowledge_base_id)

    _validate_url(url)

    try:
        reader = SimpleWebPageReader(html_to_text=True)
        documents = reader.load_data(urls=[url])

        for doc in documents:
            doc.metadata["tenant_id"] = tenant_id
            doc.metadata["knowledge_base_id"] = knowledge_base_id
            doc.metadata["source_url"] = url

        logger.info(f"Crawled {len(documents)} page(s) from {url} for tenant {tenant_id}")
        return documents
    except Exception as e:
        logger.error(f"Failed to crawl URL {url}: {e}")
        raise


def _crawl_url_fallback(url: str, tenant_id: str, knowledge_base_id: str):
    """Fallback URL crawler using requests + naive text extraction."""
    import requests
    from llama_index.core import Document

    _validate_url(url)
    response = requests.get(url, timeout=10, headers={"User-Agent": "ChatbotPlatform/1.0"})
    response.raise_for_status()

    # Strip HTML tags naively
    text = re.sub(r"<[^>]+>", " ", response.text)
    text = re.sub(r"\s+", " ", text).strip()

    doc = Document(
        text=text,
        metadata={"tenant_id": tenant_id, "knowledge_base_id": knowledge_base_id, "source_url": url},
    )
    return [doc]


# ─── Chunking ─────────────────────────────────────────────────────────────────


def chunk_documents(
    documents,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> list:
    """
    Split LlamaIndex Document objects into smaller nodes using the sentence
    splitter. Returns a list of TextNode objects ready for embedding.

    chunk_size: target size in tokens (not characters).
    chunk_overlap: token overlap between adjacent chunks for context continuity.
    """
    from llama_index.core.node_parser import SentenceSplitter

    splitter = SentenceSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )

    nodes = splitter.get_nodes_from_documents(documents)
    logger.info(f"Split {len(documents)} document(s) into {len(nodes)} chunk(s)")
    return nodes


# ─── Validation Helpers ───────────────────────────────────────────────────────


def _validate_path(file_path: str) -> None:
    """Prevent path traversal attacks by ensuring the file is inside uploads/."""
    uploads_base = os.path.realpath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads")
    )
    resolved = os.path.realpath(file_path)
    if not resolved.startswith(uploads_base + os.sep):
        raise ValueError(
            f"Path traversal blocked: '{file_path}' is outside the uploads directory."
        )


def _validate_url(url: str) -> None:
    """Basic URL validation — only allow http/https, block private/internal addresses."""
    if not url.startswith(("http://", "https://")):
        raise ValueError(f"Invalid URL scheme — only http/https allowed: {url}")

    # Block access to internal/localhost addresses
    blocked_patterns = [
        r"localhost",
        r"127\.",
        r"0\.0\.0\.0",
        r"192\.168\.",
        r"10\.",
        r"172\.(1[6-9]|2\d|3[0-1])\.",
    ]
    for pattern in blocked_patterns:
        if re.search(pattern, url, re.IGNORECASE):
            raise ValueError(f"URL points to a private/internal address — blocked: {url}")
