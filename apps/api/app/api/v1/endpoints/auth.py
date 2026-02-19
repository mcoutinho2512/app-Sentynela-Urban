from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.rate_limit import rate_limit_by_ip
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_current_user,
    hash_password,
    revoke_token,
    verify_password,
    verify_token,
)
from app.models.user import User
from app.schemas.user import (
    RefreshRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: UserCreate, request: Request, db: AsyncSession = Depends(get_db)):
    await rate_limit_by_ip(
        request,
        max_requests=settings.REGISTER_RATE_LIMIT,
        window_seconds=settings.REGISTER_RATE_WINDOW,
        action="register",
    )

    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name,
    )
    db.add(user)
    await db.flush()

    tokens = _build_tokens(user)
    return tokens


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    await rate_limit_by_ip(
        request,
        max_requests=settings.LOGIN_RATE_LIMIT,
        window_seconds=settings.LOGIN_RATE_WINDOW,
        action="login",
    )

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    return _build_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = verify_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing subject")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Rotative refresh: revoke the old refresh token
    old_jti = payload.get("jti")
    if old_jti:
        ttl = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
        await revoke_token(old_jti, ttl)

    return _build_tokens(user)


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


def _build_tokens(user: User) -> TokenResponse:
    data = {"sub": str(user.id), "role": user.role}
    return TokenResponse(
        access_token=create_access_token(data),
        refresh_token=create_refresh_token(data),
        token_type="bearer",
    )
