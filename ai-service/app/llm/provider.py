from abc import ABC, abstractmethod
from llama_index.core.llms import LLM
from app.core.config import settings


class LLMProvider(ABC):
    @abstractmethod
    def get_llm(self) -> LLM:
        pass


class OpenAIProvider(LLMProvider):
    def get_llm(self) -> LLM:
        from llama_index.llms.openai import OpenAI
        return OpenAI(
            model=settings.AI_CHAT_MODEL,
            api_key=settings.AI_API_KEY,
            temperature=0.7,
        )


class MockProvider(LLMProvider):
    """Stub provider for development when no valid AI API key is configured."""
    def get_llm(self) -> LLM:
        from llama_index.llms.openai import OpenAI
        # Return a configured LLM — will fail at query time if key is invalid,
        # but the RAG engine handles this gracefully with a fallback.
        return OpenAI(
            model=settings.AI_CHAT_MODEL,
            api_key=settings.AI_API_KEY or "sk-invalid",
            temperature=0.7,
        )


# Factory function — extend for Anthropic, etc.
def get_llm_provider() -> LLMProvider:
    provider_name = settings.AI_PROVIDER.lower()

    if not settings.AI_API_KEY or settings.AI_API_KEY.startswith("sk-demo"):
        # No valid API key — use mock provider
        return MockProvider()

    if provider_name == "openai":
        return OpenAIProvider()
    # TODO: Add AnthropicProvider, etc.
    else:
        return OpenAIProvider()
