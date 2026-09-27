from __future__ import annotations
import os
from typing import Any
from config import settings


# def _try_langchain_openai(prompt: str, temperature: float = 0.1) -> str:
#     try:
#         from langchain_openai import ChatOpenAI

#         llm = ChatOpenAI(
#             model=os.getenv("OPENAI_MODEL", "gpt-3.5-turbo"),
#             temperature=temperature,
#         )

#         response = llm.invoke(prompt)
#         return response.content

#     except Exception:
#         return ""

def _try_langchain_gemini(prompt: str, temperature: float = 0.1) -> str:
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI

        api_key = settings.gemini_api_key or os.getenv("GEMINI_API_KEY")

        if not api_key:
            return ""

        llm = ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            google_api_key=api_key,
            temperature=temperature,
        )

        response = llm.invoke(prompt)
        return response.content

    except Exception as e:
        print("Gemini Error:", e)
        return ""

def generate_text(prompt: str, *, temperature: float = 0.1) -> str:
    """Try a sequence of LangChain-backed LLMs and return the first successful response.

    Order: LangChain OpenAI LLM -> LangChain ChatOpenAI -> LangChain Google Gemini.
    Returns empty string on failure so callers can handle fallback messages.
    """

    # # Prefer OpenAI text LLM when configured
    # if os.getenv('OPENAI_API_KEY'):
    #     resp = _try_langchain_openai(prompt, temperature=temperature)
    #     if resp:
    #         return resp
    #     resp = _try_langchain_chatopenai(prompt, temperature=temperature)
    #     if resp:
    #         return resp

    # Try Gemini via LangChain integration
    if os.getenv('GEMINI_API_KEY'):
        resp = _try_langchain_gemini(prompt, temperature=temperature)
        if resp:
            return resp

    return ''


def get_gemini_llm(model: str | None = None, temperature: float = 0.0):
    """Return a LangChain `ChatGoogleGenerativeAI` instance configured with the
    GEMINI API key (from settings or env). Returns `None` if the dependency/key
    is unavailable.
    """
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
    except Exception:
        return None

    api_key = settings.gemini_api_key or os.getenv('GEMINI_API_KEY')
    if not api_key:
        return None

    model_name = model or os.getenv('GEMINI_MODEL') or settings.gemini_model or 'gemini-2.5-flash'
    try:
        return ChatGoogleGenerativeAI(model=model_name, google_api_key=api_key, temperature=temperature)
    except Exception:
        return None


# Convenience global LLM instance (None if not available).
GEMINI_LLM = get_gemini_llm()


def test_gemini_invocation():
    """Helper to test Gemini LLM invocation. Runs only when executed as a script."""
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from dotenv import load_dotenv
        import os

        load_dotenv()
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            print('[llm.test] GEMINI_API_KEY not present; skipping live Gemini test')
            return

        llm = ChatGoogleGenerativeAI(model='gemini-2.5-flash', google_api_key=api_key)
        response = llm.invoke('Hello')
        print('[llm.test] Gemini response:', getattr(response, 'content', str(response)))
    except Exception as exc:
        print('[llm.test] Gemini invocation failed:', exc)


if __name__ == '__main__':
    test_gemini_invocation()
