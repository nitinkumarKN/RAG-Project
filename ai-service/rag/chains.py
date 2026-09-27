from __future__ import annotations

from .prompt import (
    format_chat_prompt,
    format_summary_prompt,
    format_compare_prompt,
    format_flashcards_prompt,
    format_quiz_prompt,
)


class ChainFactory:
    """Lightweight prompt formatter replacement for the previous LCEL chains.

    Methods return formatted prompt strings ready to be sent to a simple LLM client.
    """

    def __init__(self):
        pass

    def format_answer_prompt(self, question: str, history: str, context: str) -> str:
        return format_chat_prompt(question, history, context)

    def format_summary_prompt(self, topic: str, context: str) -> str:
        return format_summary_prompt(topic, context)

    def format_compare_prompt(self, question: str, context: str) -> str:
        return format_compare_prompt(question, context)

    def format_flashcards_prompt(self, topic: str, context: str) -> str:
        return format_flashcards_prompt(topic, context)

    def format_quiz_prompt(self, topic: str, context: str) -> str:
        return format_quiz_prompt(topic, context)
