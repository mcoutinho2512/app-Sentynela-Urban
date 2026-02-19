from fastapi import APIRouter, Depends, HTTPException, status
from geoalchemy2.functions import ST_X, ST_Y
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.user_location import UserLocation
from app.schemas.location import LocationCreate, LocationResponse, LocationUpdate

router = APIRouter(prefix="/locations", tags=["locations"])


@router.post("", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location(
    body: LocationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    point = func.ST_SetSRID(func.ST_MakePoint(body.lon, body.lat), 4326)

    loc = UserLocation(
        user_id=current_user.id,
        label=body.label,
        type=body.type.value,
        geom=point,
    )
    db.add(loc)
    await db.flush()
    await db.refresh(loc)

    return await _location_to_response(db, loc)


@router.get("", response_model=list[LocationResponse])
async def list_locations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserLocation)
        .where(UserLocation.user_id == current_user.id)
        .order_by(UserLocation.created_at.asc())
    )
    locations = result.scalars().all()
    return [await _location_to_response(db, loc) for loc in locations]


@router.patch("/{location_id}", response_model=LocationResponse)
async def update_location(
    location_id: int,
    body: LocationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    loc = await db.get(UserLocation, location_id)
    if loc is None or loc.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    if body.label is not None:
        loc.label = body.label
    if body.lat is not None and body.lon is not None:
        loc.geom = func.ST_SetSRID(func.ST_MakePoint(body.lon, body.lat), 4326)

    db.add(loc)
    await db.flush()
    await db.refresh(loc)
    return await _location_to_response(db, loc)


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(
    location_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    loc = await db.get(UserLocation, location_id)
    if loc is None or loc.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    await db.delete(loc)
    await db.flush()


async def _location_to_response(db: AsyncSession, loc: UserLocation) -> LocationResponse:
    coords = await db.execute(
        select(
            func.ST_Y(loc.geom).label("lat"),
            func.ST_X(loc.geom).label("lon"),
        )
    )
    row = coords.one()
    return LocationResponse(
        id=loc.id,
        label=loc.label,
        type=loc.type,
        lat=row.lat,
        lon=row.lon,
        is_private=loc.is_private,
        created_at=loc.created_at,
    )
