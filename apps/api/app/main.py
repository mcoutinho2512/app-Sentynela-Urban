import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine
from app.core.logging_config import setup_logging

# Initialize structured logging
setup_logging(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown events."""
    # --- Startup ---
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    logger.info("Application started successfully")
    yield
    # --- Shutdown ---
    await engine.dispose()
    logger.info("Application shut down")


app = FastAPI(
    title="Sentynela Urban API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if os.getenv("ENVIRONMENT", "development") == "development" else None,
    redoc_url=None,
)


# ---------- Request logging + Security headers middleware ----------
@app.middleware("http")
async def request_middleware(request: Request, call_next):
    start = time.perf_counter()
    response: Response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 2)

    # Structured request log
    logger.info(
        "%s %s %s %.2fms",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
        extra={
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
        },
    )

    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(self)"
    return response


# ---------- CORS ----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# ---------- Routers ----------
from app.api.v1.endpoints import api_router  # noqa: E402

app.include_router(api_router)

# ---------- Static uploads ----------
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


# ---------- Health ----------
@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
