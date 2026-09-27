from __future__ import annotations

SYSTEM_PROMPT = """
You are an AI Medical Research Assistant.

Your job is to answer questions ONLY using the retrieved context from the uploaded medical documents.

Instructions:

1. Carefully read ALL retrieved chunks before answering.
2. If the answer is spread across multiple chunks, combine the information into one complete response.
3. Do NOT ignore relevant information just because it appears in different chunks.
4. Do NOT use outside knowledge unless the user explicitly requests it.
5. If the retrieved context contains enough information, answer confidently.
6. Only respond with:
   "I could not find this information in the uploaded documents."
   if NONE of the retrieved chunks contain relevant information.
7. If the retrieved context is only partially relevant, answer with the available information and clearly mention that the document does not provide complete details.
8. Do not refuse an answer if relevant information exists in the retrieved context.
9. Write responses in clear paragraphs using bullet points when appropriate.
10. Never hallucinate or invent facts.

Always return the response in this format:

Answer:
<Complete answer>

Source:
- Document: <filename>
- Page(s): <page numbers or N/A>

Confidence:
High | Medium | Low
"""


def build_context_block(chunks) -> str:
    """Render retrieved chunks into a readable context block for prompts."""

    context_lines = []
    for chunk in chunks:
        metadata = chunk.metadata or {}
        document_name = metadata.get('document_name') or metadata.get('documentName') or metadata.get('title') or 'Unknown document'
        page_number = metadata.get('page_number') or metadata.get('pageNumber') or metadata.get('page')
        context_lines.append(f"Document: {document_name} | Page: {page_number}\n{chunk.page_content}")
    return '\n\n'.join(context_lines)


def format_chat_prompt(question: str, history: str, context: str) -> str:
    return (
        f"{SYSTEM_PROMPT}\n\nConversation history:\n{history}\n\nRetrieved medical document excerpts:\n{context}\n\nQuestion:\n{question}\n\n"
        "Answer format:\n- Answer\n- Sources with document name and page number\n- Confidence message"
    )


def format_summary_prompt(topic: str, context: str) -> str:
    return f"{SYSTEM_PROMPT}\n\nSummarize the following retrieved document content for the user. Stay grounded in the evidence and preserve medical nuances.\n\nContext:\n{context}\n\nTopic:\n{topic}"


def format_compare_prompt(question: str, context: str) -> str:
    return f"{SYSTEM_PROMPT}\n\nCompare the documents below using these headings: Methodology, Results, Conclusion, Future Work, Limitations.\n\nContext:\n{context}\n\nComparison request:\n{question}"


def format_flashcards_prompt(topic: str, context: str) -> str:
    return f"{SYSTEM_PROMPT}\n\nGenerate study flashcards from the retrieved context. Return a concise list of question/answer pairs.\n\nContext:\n{context}\n\nTopic:\n{topic}"


def format_quiz_prompt(topic: str, context: str) -> str:
    return f"{SYSTEM_PROMPT}\n\nGenerate a quiz from the retrieved context. Include MCQs, short questions, and true/false items. Return a structured response.\n\nContext:\n{context}\n\nTopic:\n{topic}"
