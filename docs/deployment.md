# Deployment Guide

## Frontend: Vercel

- Set the project root to `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables:
  - `VITE_API_BASE_URL`
  - `VITE_AI_SERVICE_URL`
  - `VITE_APP_NAME`

For this deployment, set `VITE_API_BASE_URL` to
`https://rag-project-back.onrender.com/api`. Vite embeds this value at build
time, so redeploy the frontend after changing it.

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

Set `CLIENT_URL` to `https://rag-project-az0l.onrender.com` and
`AI_SERVICE_URL` to `https://rag-project-ai.onrender.com`. The backend also
accepts an AI URL ending in `/api` and normalizes it before calling the AI
upload and chat endpoints.

## AI Service: Render

- Set the project root to `ai-service`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Environment variables:
  - `GEMINI_API_KEY`
  - `FAISS_INDEX_PATH`
  - `UPLOAD_DIR`
  - `CORS_ORIGINS`

Set `CORS_ORIGINS` to `https://rag-project-az0l.onrender.com`.

## MongoDB Atlas

- Create a cluster
- Whitelist Render/Vercel IP ranges if needed
- Store the connection string in `MONGODB_URI`

## Docker

You can also use `docker-compose.yml` for local containerized development.
