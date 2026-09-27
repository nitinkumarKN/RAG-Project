from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
import logging
from fastapi import HTTPException


app = FastAPI(title='AI Medical Research Assistant AI Service', version='2.0.0')

# Configure root logger early so other modules inherit settings
logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO), format='[%(levelname)s] %(name)s: %(message)s')
logger = logging.getLogger('ai-service')

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.api_cors_origins if settings.api_cors_origins != ['*'] else ['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

settings.upload_dir.mkdir(parents=True, exist_ok=True)
settings.vector_db_dir.mkdir(parents=True, exist_ok=True)
app.mount('/uploads', StaticFiles(directory=str(settings.upload_dir)), name='uploads')

# Ensure Gemini key from settings is present in process env for any integrations
import os
if settings.gemini_api_key:
    os.environ.setdefault('GEMINI_API_KEY', settings.gemini_api_key)

# Import and include routers in guarded blocks so import-time errors in heavy modules
# (for example missing optional deps) don't prevent the app from starting and
# serving a minimal health endpoint.
try:
    from api.health import router as health_router
    app.include_router(health_router, prefix='/api')
except Exception as exc:  # pragma: no cover - show import errors
    logger.exception('Failed to include health router: %s', exc)

try:
    from api.upload import router as upload_router
    app.include_router(upload_router, prefix='/api')
except Exception as exc:
    logger.exception('Failed to include upload router: %s', exc)

try:
    from api.search import router as search_router
    app.include_router(search_router, prefix='/api')
except Exception as exc:
    logger.exception('Failed to include search router: %s', exc)

try:
    from api.chat import router as chat_router
    app.include_router(chat_router, prefix='/api')
except Exception as exc:
    logger.exception('Failed to include chat router: %s', exc)


# Provide a lightweight root health endpoint so the service is reachable even if
# some optional parts fail to import during startup.
@app.get('/health')
def root_health():
    return {'status': 'ok'}


@app.get('/')
def root():
    """Small root response for quick manual checks."""

    return {
        'service': 'ai-service',
        'status': 'ok',
        'uploadsDir': str(settings.upload_dir),
        'vectorDbDir': str(settings.vector_db_dir),
    }


if __name__ == '__main__':
    import uvicorn

    uvicorn.run('app:app', host='0.0.0.0', port=8000, reload=True)


@app.on_event("startup")
async def _print_startup_info():
    # Helpful non-sensitive startup info to diagnose why the service may not respond.
    import importlib.util
    import os

    gemini_present = bool(settings.gemini_api_key or os.getenv('GEMINI_API_KEY'))
    langchain_gemini = importlib.util.find_spec('langchain_google_genai') is not None
    faiss_installed = importlib.util.find_spec('faiss') is not None
    print(
        f"[ai-service startup] gemini_present={gemini_present} langchain_google_genai={langchain_gemini} faiss_installed={faiss_installed} uploads_dir={settings.upload_dir} vector_db_dir={settings.vector_db_dir}"
    )
    if gemini_present:
        print('[ai-service startup] Gemini API Loaded ✓ (key present, not displayed)')
    # Print registered routes for quick debugging
    try:
        routes = sorted([route.path for route in app.routes])
        print('[ai-service startup] Routes loaded:')
        for r in routes:
            print('  ', r)
    except Exception:
        print('[ai-service startup] Unable to list routes')
