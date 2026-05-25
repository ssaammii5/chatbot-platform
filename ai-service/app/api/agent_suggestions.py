"""
ai-service/app/api/agent_suggestions.py
=========================================
AI-generated reply suggestions for human agents.

When an agent picks up a conversation, this endpoint generates 2-3 suggested
replies based on the conversation history and the tenant's knowledge base.
The agent sees these as "quick reply" options in the agent workspace.
"""
import asyncio
import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List
from app.core.config import settings
from app.llm.provider import get_llm_provider

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Models ──────────────────────────────────────────────────────────────────

class Message(BaseModel):
    role: str   # 'user' | 'bot' | 'agent'
    content: str


class SuggestRepliesRequest(BaseModel):
    tenantId: str
    conversationId: str
    messages: List[Message]
    latestUserMessage: str


class SuggestRepliesResponse(BaseModel):
    suggestions: List[str]
    model: str


# ─── Validation ──────────────────────────────────────────────────────────────

import re as _re
_UUID_PATTERN = _re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    _re.IGNORECASE,
)

def _validate_uuid(value: str, field: str) -> None:
    if not value or not _UUID_PATTERN.match(value):
        raise HTTPException(status_code=400, detail=f"Invalid {field} format")


# ─── Endpoint ─────────────────────────────────────────────────────────────────

@router.post("/agents/suggest", response_model=SuggestRepliesResponse)
async def suggest_agent_replies(request: SuggestRepliesRequest):
    """
    Generate 2-3 suggested reply options for a human agent based on:
    - The last few messages in the conversation
    - The tenant's knowledge base (via LLM context injection)

    The agent can click a suggestion to auto-fill their reply box.
    Suggestions are non-binding — agents always write the final message.
    """
    _validate_uuid(request.tenantId, "tenantId")
    _validate_uuid(request.conversationId, "conversationId")

    if not request.latestUserMessage or len(request.latestUserMessage.strip()) == 0:
        raise HTTPException(status_code=400, detail="latestUserMessage cannot be empty")

    if len(request.latestUserMessage) > 2000:
        raise HTTPException(status_code=400, detail="latestUserMessage too long")

    # Build a compact conversation summary (last 6 messages max)
    recent_messages = request.messages[-6:] if len(request.messages) > 6 else request.messages
    history_text = "\n".join(
        f"[{msg.role.upper()}]: {msg.content[:500]}"
        for msg in recent_messages
    )

    prompt = f"""You are an assistant helping a human support agent reply to a customer.
Based on the conversation history and the customer's latest message, suggest 2-3 short, helpful reply options for the agent.

Conversation History:
{history_text}

Customer's latest message: "{request.latestUserMessage}"

Rules:
- Each suggestion must be a complete sentence the agent can send directly.
- Keep suggestions concise (1-3 sentences each).
- Be professional and empathetic.
- Do NOT include agent names or identifiers.
- Separate each suggestion with a newline starting with "- ".

Reply options:"""

    try:
        llm = get_llm_provider().get_llm()
        loop = asyncio.get_event_loop()

        def _generate():
            response = llm.complete(prompt, max_tokens=400)
            return response.text

        raw_text = await loop.run_in_executor(None, _generate)

        # Parse the "- " prefixed suggestions
        suggestions = []
        for line in raw_text.strip().split("\n"):
            line = line.strip()
            if line.startswith("- "):
                suggestions.append(line[2:].strip())
            elif line and not suggestions:
                # Fallback: include non-empty lines if no dashes found
                suggestions.append(line)

        # Clamp to at most 3 suggestions
        suggestions = [s for s in suggestions if s][:3]

        if not suggestions:
            # Safe fallback if LLM output is unparseable
            suggestions = [
                "Thank you for reaching out! Let me look into this for you right away.",
                "I understand your concern. Could you provide more details so I can better assist you?",
            ]

        return SuggestRepliesResponse(suggestions=suggestions, model=settings.AI_CHAT_MODEL)

    except Exception as e:
        logger.error(f"Failed to generate agent suggestions for tenant {request.tenantId}: {e}")
        # Return safe fallback suggestions rather than a 500 error
        return SuggestRepliesResponse(
            suggestions=[
                "Thank you for reaching out! I'll be happy to help you with that.",
                "I understand. Let me check on this for you.",
            ],
            model=settings.AI_CHAT_MODEL,
        )
