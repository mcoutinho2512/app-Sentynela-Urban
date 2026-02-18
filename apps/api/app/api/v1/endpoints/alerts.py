from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.alert import AlertPreference
from app.models.incident import Incident
from app.models.user import User
from app.schemas.alert import AlertFeedItem, AlertPreferenceCreate, AlertPreferenceResponse

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.post("/preferences", response_model=AlertPreferenceResponse, status_code=status.HTTP_201_CREATED)
async def create_alert_preference(
    body: AlertPreferenceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    center_geom = None
    if body.center_lat is not None and body.center_lon is not None:
        center_geom = func.ST_SetSRID(func.ST_MakePoint(body.center_lon, body.center_lat), 4326)

    pref = AlertPreference(
        user_id=current_user.id,
        mode=body.mode,
        neighborhood_name=body.neighborhood_name,
        center_geom=center_geom,
        radius_km=body.radius_km,
        types=body.types,
        min_severity=body.min_severity,
        enabled=body.enabled,
    )
    db.add(pref)
    await db.flush()
    await db.refresh(pref)

    return await _pref_to_response(db, pref)


@router.get("/preferences", response_model=list[AlertPreferenceResponse])
async def list_alert_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AlertPreference)
        .where(AlertPreference.user_id == current_user.id)
        .order_by(AlertPreference.created_at.desc())
    )
    prefs = result.scalars().all()
    return [await _pref_to_response(db, p) for p in prefs]


@router.delete("/preferences/{pref_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert_preference(
    pref_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pref = await db.get(AlertPreference, pref_id)
    if pref is None or pref.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preference not found")
    await db.delete(pref)
    await db.flush()


@router.get("/feed", response_model=list[AlertFeedItem])
async def alert_feed(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return recent incidents matching the user's enabled alert preferences."""
    prefs_result = await db.execute(
        select(AlertPreference).where(
            AlertPreference.user_id == current_user.id,
            AlertPreference.enabled.is_(True),
        )
    )
    prefs = prefs_result.scalars().all()

    items: list[AlertFeedItem] = []
    seen_ids: set[int] = set()

    severity_order = {"baixa": 1, "media": 2, "alta": 3}

    for pref in prefs:
        if pref.mode == "radius" and pref.center_geom is not None and pref.radius_km:
            radius_m = pref.radius_km * 1000
            center_coords = await db.execute(
                select(
                    func.ST_Y(pref.center_geom).label("lat"),
                    func.ST_X(pref.center_geom).label("lon"),
                )
            )
            c = center_coords.one()

            center_point = func.ST_SetSRID(func.ST_MakePoint(c.lon, c.lat), 4326)

            query = (
                select(
                    Incident,
                    func.ST_Distance(
                        func.ST_Geography(Incident.public_geom),
                        func.ST_Geography(center_point),
                    ).label("distance_m"),
                    func.ST_Y(Incident.public_geom).label("lat"),
                    func.ST_X(Incident.public_geom).label("lon"),
                )
                .where(
                    Incident.status == "open",
                    func.ST_DWithin(
                        Incident.public_geom,
                        func.ST_Geography(center_point),
                        radius_m,
                    ),
                )
                .order_by(Incident.created_at.desc())
                .limit(50)
            )

            if pref.types:
                query = query.where(Incident.type.in_(pref.types))

            min_sev = severity_order.get(pref.min_severity, 1)

            rows = await db.execute(query)
            for inc, distance_m, lat, lon in rows.all():
                if inc.id in seen_ids:
                    continue
                inc_sev = severity_order.get(inc.severity, 1)
                if inc_sev < min_sev:
                    continue
                seen_ids.add(inc.id)
                items.append(
                    AlertFeedItem(
                        incident_id=inc.id,
                        type=inc.type,
                        severity=inc.severity,
                        description=inc.description,
                        lat=lat,
                        lon=lon,
                        distance_km=round(distance_m / 1000, 2),
                        created_at=inc.created_at,
                    )
                )

    items.sort(key=lambda x: x.created_at, reverse=True)
    return items


async def _pref_to_response(db: AsyncSession, pref: AlertPreference) -> AlertPreferenceResponse:
    center_lat: float | None = None
    center_lon: float | None = None
    if pref.center_geom is not None:
        coords = await db.execute(
            select(
                func.ST_Y(pref.center_geom).label("lat"),
                func.ST_X(pref.center_geom).label("lon"),
            )
        )
        row = coords.one()
        center_lat = row.lat
        center_lon = row.lon

    return AlertPreferenceResponse(
        id=pref.id,
        user_id=pref.user_id,
        mode=pref.mode,
        neighborhood_name=pref.neighborhood_name,
        center_lat=center_lat,
        center_lon=center_lon,
        radius_km=pref.radius_km,
        types=pref.types,
        min_severity=pref.min_severity,
        enabled=pref.enabled,
    )
