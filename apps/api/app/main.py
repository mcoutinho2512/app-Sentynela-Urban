import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown events."""
    # --- Startup ---
    # Test the database connection
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    yield
    # --- Shutdown ---
    await engine.dispose()


app = FastAPI(
    title="Urban Assistant API",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------- CORS ----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
