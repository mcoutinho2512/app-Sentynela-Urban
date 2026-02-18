from __future__ import annotations

import json
from typing import Any

import redis.asyncio as aioredis

from app.core.config import settings

redis_client: aioredis.Redis = aioredis.from_url(
    settings.REDIS_URL,
    decode_responses=True,
)


async def get_redis() -> aioredis.Redis:
    """FastAPI dependency that returns the shared async Redis client."""
    return redis_client


# ---------------------------------------------------------------------------
# Cache helper functions
# ---------------------------------------------------------------------------

async def cache_get(key: str) -> Any | None:
    """Retrieve a JSON-serialised value from Redis, or None if missing."""
    raw = await redis_client.get(key)
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return raw


async def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    """Store a value in Redis as JSON with a TTL (seconds)."""
    serialised = json.dumps(value, default=str)
    await redis_client.set(key, serialised, ex=ttl)


async def cache_delete(key: str) -> None:
    """Remove a key from Redis."""
    await redis_client.delete(key)
