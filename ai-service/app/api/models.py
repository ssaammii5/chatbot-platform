from pydantic import BaseModel
from typing import Optional, List


class ChatRequest(BaseModel):
    tenantId: str
    query: str


class DocumentRequest(BaseModel):
    tenantId: str
    knowledgeBaseId: str
    filePath: str


class TokenReport(BaseModel):
    tenantId: str
    tokens: int
    model: str
    action: str


class ChatResponse(BaseModel):
    content: str
    requires_handoff: bool = False
    citations: Optional[List[str]] = None
    tokens_used: Optional[int] = None


class DocumentResponse(BaseModel):
    status: str
    knowledgeBaseId: Optional[str] = None
    message: Optional[str] = None
