# Architecture

## High-Level Flow

1. User authenticates in the React frontend.
2. The frontend sends JWT-protected requests to the Node backend.
3. The backend stores user, document, and chat metadata in MongoDB.
4. When a PDF is uploaded, the backend extracts text from the file and stores the document record.
5. When a chat question is submitted, the backend sends the user documents to the Python AI service.
6. The AI service performs retrieval with FAISS and generates a grounded answer using Gemini.
7. The backend stores the response and sources in chat history.

## Responsibilities

### Frontend

- Landing page and marketing sections
- Authentication pages
- Protected dashboard experience
- Upload flow, papers grid, chat UI, profile, and settings

### Backend

- JWT authentication
- Document upload and file storage
- MongoDB persistence
- Chat history API
- Request validation and security middleware

### AI Service

- Document retrieval
- Text chunking and embeddings
- Gemini-backed answer generation
- Refusal response when no evidence is found

## Design Principles

- Keep logic modular and easy to trace.
- Keep data ownership tied to the authenticated user.
- Avoid hallucinations by forcing document-only answers.
- Prefer small, explicit services over hidden framework behavior.
