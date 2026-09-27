# Deployment Guide

## Frontend: Vercel

- Set the project root to `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables:
  - `VITE_API_BASE_URL`
  - `VITE_AI_SERVICE_URL`
  - `VITE_APP_NAME`

## Backend: Render

- Set the project root to `backend`
- Build command: `npm install`
- Start command: `npm start`
- Environment variables:
  - `PORT`
  - `NODE_ENV`
  - `CLIENT_URL`
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `JWT_EXPIRES_IN`
  - `AI_SERVICE_URL`
  - `UPLOAD_DIR`
  - `MAX_FILE_SIZE_MB`

## AI Service: Render

- Set the project root to `ai-service`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app:app --host 0.0.0.0 --port 8000`
- Environment variables:
  - `GEMINI_API_KEY`
  - `FAISS_INDEX_PATH`
  - `UPLOAD_DIR`
  - `CORS_ORIGINS`

## MongoDB Atlas

- Create a cluster
- Whitelist Render/Vercel IP ranges if needed
- Store the connection string in `MONGODB_URI`

## Docker

You can also use `docker-compose.yml` for local containerized development.
