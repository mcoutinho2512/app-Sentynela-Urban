from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.billing import SubscribeRequest, SubscriptionResponse

router = APIRouter(prefix="/billing", tags=["billing"])

VALID_PLANS = {"pro", "business"}


@router.post("/subscribe", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def subscribe(
    body: SubscribeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.plan not in VALID_PLANS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Plan must be one of: {', '.join(sorted(VALID_PLANS))}",
        )

    # Check for existing active subscription
    existing = await db.execute(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.status == "active",
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Active subscription already exists. Cancel first.",
        )

    sub = Subscription(
        user_id=current_user.id,
        provider="mock",
        status="active",
        plan=body.plan,
    )
    db.add(sub)

    # Upgrade user role
    current_user.role = body.plan
    db.add(current_user)

    await db.flush()
    await db.refresh(sub)

    return SubscriptionResponse(
        id=sub.id,
        plan=sub.plan,
        status=sub.status,
        current_period_end=sub.current_period_end,
    )


@router.get("/subscription", response_model=SubscriptionResponse | None)
async def get_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Subscription)
        .where(
            Subscription.user_id == current_user.id,
            Subscription.status == "active",
        )
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    sub = result.scalar_one_or_none()
    if sub is None:
        return None

    return SubscriptionResponse(
        id=sub.id,
        plan=sub.plan,
        status=sub.status,
        current_period_end=sub.current_period_end,
    )


@router.post("/cancel", response_model=SubscriptionResponse)
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.status == "active",
        )
    )
    sub = result.scalar_one_or_none()
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found",
        )

    sub.status = "cancelled"
    db.add(sub)

    # Downgrade user role back to free
    current_user.role = "free"
    db.add(current_user)

    await db.flush()
    await db.refresh(sub)

    return SubscriptionResponse(
        id=sub.id,
        plan=sub.plan,
        status=sub.status,
        current_period_end=sub.current_period_end,
    )
