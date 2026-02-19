from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2 import Geography
import httpx

from app.core.config import settings
from app.core.database import get_db
from app.core.redis import cache_get, cache_set
from app.core.security import get_current_user
from app.models.incident import Incident
from app.models.user import User
from app.models.user_location import UserLocation
from app.schemas.route import (
    CommuteRequest,
    CustomRouteRequest,
    RouteAlternative,
    RouteResponse,
)

router = APIRouter(prefix="/routes", tags=["routes"])

ORS_BASE = "https://api.openrouteservice.org/v2/directions"


@router.post("/commute", response_model=RouteAlternative)
async def commute_route(
    body: CommuteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Compute a route between the user's saved 'home' and 'work' locations."""
    home = await _get_user_location(db, current_user.id, "home")
    work = await _get_user_location(db, current_user.id, "work")

    if home is None or work is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please save both a 'home' and 'work' location first",
        )

    home_coords = await _extract_coords(db, home.geom)
    work_coords = await _extract_coords(db, work.geom)

    return await _fetch_route(
        db,
        origin_lat=home_coords[0],
        origin_lon=home_coords[1],
        dest_lat=work_coords[0],
        dest_lon=work_coords[1],
        profile=body.profile.value,
    )


@router.post("/custom", response_model=RouteAlternative)
async def custom_route(
    body: CustomRouteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Compute a route between arbitrary origin and destination."""
    return await _fetch_route(
        db,
        origin_lat=body.origin_lat,
        origin_lon=body.origin_lon,
        dest_lat=body.dest_lat,
        dest_lon=body.dest_lon,
        profile=body.profile.value,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_user_location(db: AsyncSession, user_id: int, loc_type: str) -> UserLocation | None:
    result = await db.execute(
        select(UserLocation).where(
            UserLocation.user_id == user_id,
            UserLocation.type == loc_type,
        ).limit(1)
    )
    return result.scalar_one_or_none()


async def _extract_coords(db: AsyncSession, geom) -> tuple[float, float]:
    coords = await db.execute(
        select(
            func.ST_Y(geom).label("lat"),
            func.ST_X(geom).label("lon"),
        )
    )
    row = coords.one()
    return (row.lat, row.lon)


async def _fetch_route(
    db: AsyncSession,
    origin_lat: float,
    origin_lon: float,
    dest_lat: float,
    dest_lon: float,
    profile: str,
) -> RouteAlternative:
    """Call OpenRouteService and enrich with incidents along route."""
    cache_key = f"route:{profile}:{origin_lat:.5f},{origin_lon:.5f}-{dest_lat:.5f},{dest_lon:.5f}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return RouteAlternative.model_validate(cached)

    if not settings.OPENROUTESERVICE_API_KEY:
        # Return a mock/fallback route when no API key is configured
        mock_route = RouteResponse(
            geometry=None,
            duration_seconds=0,
            distance_meters=0,
            incidents_on_route=[],
            risk_score=0.0,
        )
        return RouteAlternative(routes=[mock_route])

    url = f"{ORS_BASE}/{profile}"
    headers = {"Authorization": settings.OPENROUTESERVICE_API_KEY}
    payload = {
        "coordinates": [
            [origin_lon, origin_lat],
            [dest_lon, dest_lat],
        ],
        "alternative_routes": {"target_count": 3},
    }

    transport = httpx.AsyncHTTPTransport(retries=2)
    async with httpx.AsyncClient(timeout=15, transport=transport) as client:
        try:
            resp = await client.post(url, json=payload, headers=headers)
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Route service unavailable. Try again later.",
            ) from exc

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Route service error: {resp.status_code}",
        )

    data = resp.json()
    ors_routes = data.get("routes", [])

    routes: list[RouteResponse] = []
    for ors_route in ors_routes:
        summary = ors_route.get("summary", {})
        geometry = ors_route.get("geometry")
        duration = summary.get("duration", 0)
        distance = summary.get("distance", 0)

        # Find open incidents within 200m of the route bounding box (simplified)
        incidents_nearby = await _incidents_near_line(
            db, origin_lat, origin_lon, dest_lat, dest_lon
        )

        risk_score = min(len(incidents_nearby) * 0.15, 1.0)

        routes.append(
            RouteResponse(
                geometry=geometry,
                duration_seconds=int(duration),
                distance_meters=int(distance),
                incidents_on_route=incidents_nearby,
                risk_score=round(risk_score, 2),
            )
        )

    result = RouteAlternative(routes=routes)

    # Cache for 2 minutes
    await cache_set(cache_key, result.model_dump(), ttl=120)

    return result


async def _incidents_near_line(
    db: AsyncSession,
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
    buffer_m: int = 200,
) -> list[dict]:
    """Return simplified incident dicts near the straight-line corridor."""
    line = func.ST_SetSRID(
        func.ST_MakeLine(
            func.ST_MakePoint(lon1, lat1),
            func.ST_MakePoint(lon2, lat2),
        ),
        4326,
    )

    query = (
        select(
            Incident.id,
            Incident.type,
            Incident.severity,
            func.ST_Y(Incident.public_geom).label("lat"),
            func.ST_X(Incident.public_geom).label("lon"),
        )
        .where(
            Incident.status == "open",
            func.ST_DWithin(
                cast(Incident.public_geom, Geography),
                cast(line, Geography),
                buffer_m,
            ),
        )
        .limit(20)
    )

    rows = await db.execute(query)
    return [
        {
            "incident_id": r.id,
            "type": r.type,
            "severity": r.severity,
            "lat": r.lat,
            "lon": r.lon,
        }
        for r in rows.all()
    ]
