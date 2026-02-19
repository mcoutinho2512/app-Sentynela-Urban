"""Redis-based sliding window rate limiter."""

from fastapi import HTTPException, Request, status

from app.core.redis import redis_client


async def check_rate_limit(
    key: str,
    max_requests: int,
    window_seconds: int,
) -> None:
    """Check and increment rate limit counter. Raises 429 if exceeded."""
    redis_key = f"rl:{key}"
    current = await redis_client.get(redis_key)

    if current is not None and int(current) >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Try again later.",
        )

    pipe = redis_client.pipeline()
    pipe.incr(redis_key)
    pipe.expire(redis_key, window_seconds)
    await pipe.execute()


async def rate_limit_by_ip(request: Request, max_requests: int, window_seconds: int, action: str) -> None:
    """Rate limit by client IP address."""
    client_ip = request.client.host if request.client else "unknown"
    await check_rate_limit(f"{action}:{client_ip}", max_requests, window_seconds)


async def rate_limit_by_user(user_id: int, max_requests: int, window_seconds: int, action: str) -> None:
    """Rate limit by authenticated user ID."""
    await check_rate_limit(f"{action}:u:{user_id}", max_requests, window_seconds)
