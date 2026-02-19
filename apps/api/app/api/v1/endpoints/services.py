from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2 import Geography
from sqlalchemy import cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_admin_user, get_current_user
from app.models.service import Service
from app.models.user import User
from app.schemas.service import ServiceCreate, ServiceListResponse, ServiceResponse

router = APIRouter(prefix="/services", tags=["services"])


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


@router.get("", response_model=ServiceListResponse)
async def list_services(
    lat: float = Query(...),
    lon: float = Query(...),
    radius_m: int = Query(2000, ge=100, le=50000),
    category: str | None = None,
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

    count_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    rows = await db.execute(base.order_by(Service.created_at.desc()).offset(offset).limit(limit))
    services = rows.scalars().all()

    items = [await _service_to_response(db, svc) for svc in services]
    return ServiceListResponse(services=items, total=total)


@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(service_id: int, db: AsyncSession = Depends(get_db)):
    svc = await db.get(Service, service_id)
    if svc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    return await _service_to_response(db, svc)


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
