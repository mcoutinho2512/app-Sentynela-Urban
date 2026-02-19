from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2 import Geography
from sqlalchemy import cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rate_limit import rate_limit_by_user
from app.core.security import get_admin_user, get_current_user
from app.models.service import Service
from app.models.user import User
from app.schemas.service import ServiceCreate, ServiceListResponse, ServiceResponse, ServiceUpdate

router = APIRouter(prefix="/services", tags=["services"])

# Plan limits for service listings
_PLAN_SERVICE_LIMITS = {"pro": 1, "business": 5, "admin": 999}


@router.post("", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    body: ServiceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role not in ("pro", "business", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pro or Business plan required to list services",
        )

    await rate_limit_by_user(current_user.id, max_requests=5, window_seconds=3600, action="create_service")

    # Check plan limit
    max_services = _PLAN_SERVICE_LIMITS.get(current_user.role, 0)
    existing_count = (
        await db.execute(
            select(func.count()).where(
                Service.user_id == current_user.id,
                Service.status.in_(["pending", "approved"]),
            )
        )
    ).scalar() or 0

    if existing_count >= max_services:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your plan allows up to {max_services} service(s). Upgrade to add more.",
        )

    point = func.ST_SetSRID(func.ST_MakePoint(body.lon, body.lat), 4326)

    svc = Service(
        user_id=current_user.id,
        plan_level=current_user.role if current_user.role in ("pro", "business") else "pro",
        name=body.name,
        category=body.category,
        description=body.description,
        phone=body.phone,
        whatsapp=body.whatsapp,
        hours=body.hours,
        geom=point,
        images=body.images or [],
    )
    db.add(svc)
    await db.flush()
    await db.refresh(svc)

    return await _service_to_response(db, svc)


@router.get("/mine", response_model=list[ServiceResponse])
async def list_my_services(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List current user's own services (all statuses)."""
    rows = await db.execute(
        select(Service)
        .where(Service.user_id == current_user.id)
        .order_by(Service.created_at.desc())
    )
    services = rows.scalars().all()
    return [await _service_to_response(db, svc) for svc in services]


@router.get("/limits")
async def service_limits(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the user's service plan limits and current usage."""
    max_services = _PLAN_SERVICE_LIMITS.get(current_user.role, 0)
    existing_count = (
        await db.execute(
            select(func.count()).where(
                Service.user_id == current_user.id,
                Service.status.in_(["pending", "approved"]),
            )
        )
    ).scalar() or 0

    return {
        "role": current_user.role,
        "max_services": max_services,
        "current_count": existing_count,
        "can_create": current_user.role in ("pro", "business", "admin") and existing_count < max_services,
    }


@router.get("", response_model=ServiceListResponse)
async def list_services(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    radius_m: int = Query(2000, ge=100, le=50000),
    category: str | None = None,
    search: str | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    center = func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)

    base = select(Service).where(
        Service.status == "approved",
        func.ST_DWithin(
            cast(Service.geom, Geography),
            cast(center, Geography),
            radius_m,
        ),
    )

    if category:
        base = base.where(Service.category == category)

    if search:
        search_pattern = f"%{search}%"
        base = base.where(
            Service.name.ilike(search_pattern) | Service.description.ilike(search_pattern)
        )

    count_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Business plan services ranked first, then by creation date
    rows = await db.execute(
        base.order_by(
            (Service.plan_level == "business").desc(),
            Service.created_at.desc(),
        )
        .offset(offset)
        .limit(limit)
    )
    services = rows.scalars().all()

    items = [await _service_to_response(db, svc) for svc in services]
    return ServiceListResponse(services=items, total=total)


@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(service_id: int, db: AsyncSession = Depends(get_db)):
    svc = await db.get(Service, service_id)
    if svc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    return await _service_to_response(db, svc)


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: int,
    body: ServiceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = await db.get(Service, service_id)
    if svc is None or svc.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        if field in ("lat", "lon"):
            continue
        setattr(svc, field, value)

    if body.lat is not None and body.lon is not None:
        svc.geom = func.ST_SetSRID(func.ST_MakePoint(body.lon, body.lat), 4326)

    # Reset to pending for re-review after edit
    svc.status = "pending"
    db.add(svc)
    await db.flush()
    await db.refresh(svc)
    return await _service_to_response(db, svc)


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(
    service_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = await db.get(Service, service_id)
    if svc is None or svc.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    await db.delete(svc)
    await db.flush()


@router.patch("/{service_id}/approve", response_model=ServiceResponse)
async def approve_service(
    service_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    svc = await db.get(Service, service_id)
    if svc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")

    svc.status = "approved"
    db.add(svc)
    await db.flush()
    await db.refresh(svc)
    return await _service_to_response(db, svc)


@router.patch("/{service_id}/reject", response_model=ServiceResponse)
async def reject_service(
    service_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    svc = await db.get(Service, service_id)
    if svc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")

    svc.status = "rejected"
    db.add(svc)
    await db.flush()
    await db.refresh(svc)
    return await _service_to_response(db, svc)


async def _service_to_response(db: AsyncSession, svc: Service) -> ServiceResponse:
    coords = await db.execute(
        select(
            func.ST_Y(svc.geom).label("lat"),
            func.ST_X(svc.geom).label("lon"),
        )
    )
    row = coords.one()
    return ServiceResponse(
        id=svc.id,
        user_id=svc.user_id,
        name=svc.name,
        category=svc.category,
        description=svc.description,
        phone=svc.phone,
        whatsapp=svc.whatsapp,
        hours=svc.hours,
        lat=row.lat,
        lon=row.lon,
        images=svc.images or [],
        status=svc.status,
        plan_level=svc.plan_level,
        created_at=svc.created_at,
    )
