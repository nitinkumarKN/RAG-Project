# AI Medical Research Assistant

Production-oriented MERN + Python + LangChain application for answering questions from uploaded medical research papers.

> This project is for educational purposes only and should not be used for medical diagnosis.

## Overview

Users upload PDF papers, the backend stores metadata and extracted text, and the AI service performs retrieval-based answering with citations and refusal behavior when evidence is missing.

## Features

- JWT authentication with register, login, profile, and protected routes
- Forgot password and reset password flows
- Account deletion with cascading cleanup of documents and chat history
- PDF upload with file size validation and user-scoped storage
- MongoDB models for users, documents, and chat history
- AI chat grounded in uploaded documents only
- Source citations with document name and page number
- Searchable paper library and saved conversation history
- Responsive medical dashboard UI with landing page and onboarding flow
- Docker support for local deployment

## Tech Stack

- Frontend: React, Vite, JavaScript, TailwindCSS, Axios, React Router, React Icons, React Hot Toast, Framer Motion
- Backend: Node.js, Express.js, MongoDB, Mongoose, JWT, bcrypt, Multer, Helmet, CORS, Morgan, Express Validator
- AI Service: Python, FastAPI, LangChain, FAISS, Hugging Face embeddings, Google Gemini, PyPDF, Uvicorn, Pydantic

## Folder Structure

```text
medical-rag/
├── frontend/
├── backend/
├── ai-service/
├── docs/
├── docker/
└── README.md
```

## API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password/:token`
- `GET /api/user/profile`
- `PUT /api/user/profile`
- `DELETE /api/user/account`
- `POST /api/document/upload`
- `GET /api/document`
- `DELETE /api/document/:id`
- `POST /api/chat`
- `GET /api/chat/history`
- `DELETE /api/chat/history`

## Installation

### Frontend

```bash
cd frontend
npm install
```

### Backend

```bash
cd backend
npm install
```

### AI Service

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Environment Variables

Create the `.env` files from the `.env.example` files in each service folder.

### Frontend

- `VITE_API_BASE_URL`
- `VITE_AI_SERVICE_URL`
- `VITE_APP_NAME`

### Backend

- `PORT`
- `NODE_ENV`
- `CLIENT_URL`
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `AI_SERVICE_URL`
- `UPLOAD_DIR`
- `MAX_FILE_SIZE_MB`

### AI Service

- `GEMINI_API_KEY`
- `FAISS_INDEX_PATH`
- `UPLOAD_DIR`
- `CORS_ORIGINS`

## Run Instructions

### Frontend

```bash
cd frontend
npm run dev
```

### Backend

```bash
cd backend
npm run dev
```

### AI Service

```bash
cd ai-service
.venv\Scripts\python.exe -m uvicorn app:app --reload --port 8000
```

## Deployment

- Frontend: Vercel
- Backend: Render
- AI Service: Render
- MongoDB: MongoDB Atlas

See `docs/deployment.md` for the deployment checklist.

## Testing

- Frontend build: `npm run build` inside `frontend/`
- Backend syntax check: `node --check src/app.js` inside `backend/`
- AI service compile check: `python -m py_compile app.py rag.py prompt.py loader.py embeddings.py` inside `ai-service/`

## Future Improvements

- Streaming responses from the AI service
- Email verification and password reset flow
- Google login
- Admin dashboard and analytics
- PDF preview with highlighted citations
- Better semantic search indexing per document
- Export chat as PDF or markdown

## Notes

The current implementation is designed to be easy to extend, while staying modular and production-minded without unnecessary overengineering.
