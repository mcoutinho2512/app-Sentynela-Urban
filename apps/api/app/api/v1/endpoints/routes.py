import math

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

    if settings.OPENROUTESERVICE_API_KEY:
        result = await _fetch_ors(
            db, origin_lat, origin_lon, dest_lat, dest_lon, profile
        )
    else:
        # Fallback: free OSRM demo server (no API key needed)
        result = await _fetch_osrm(
            db, origin_lat, origin_lon, dest_lat, dest_lon, profile
        )

    if not result.routes:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not compute route. Try again later.",
        )

    # Cache for 2 minutes
    await cache_set(cache_key, result.model_dump(), ttl=120)

    return result


OSRM_BASE = "https://router.project-osrm.org/route/v1"

# Map ORS profiles to OSRM profiles
_OSRM_PROFILE_MAP = {
    "driving-car": "driving",
    "cycling-regular": "cycling",
    "foot-walking": "walking",
}


def _perpendicular_waypoints(
    lat1: float, lon1: float, lat2: float, lon2: float, offset_km: float = 1.0,
) -> list[tuple[float, float]]:
    """Generate 2 waypoints offset perpendicular to the route midpoint."""
    mid_lat = (lat1 + lat2) / 2
    mid_lon = (lon1 + lon2) / 2
    angle = math.atan2(lon2 - lon1, lat2 - lat1)
    offset_deg = offset_km / 111.0
    perp1 = angle + math.pi / 2
    perp2 = angle - math.pi / 2
    return [
        (mid_lat + offset_deg * math.cos(perp1), mid_lon + offset_deg * math.sin(perp1)),
        (mid_lat + offset_deg * math.cos(perp2), mid_lon + offset_deg * math.sin(perp2)),
    ]


async def _osrm_call(
    client: httpx.AsyncClient, osrm_profile: str, coords_str: str,
) -> dict | None:
    """Single OSRM request, returns parsed JSON or None on failure."""
    url = f"{OSRM_BASE}/{osrm_profile}/{coords_str}"
    params = {"overview": "full", "geometries": "geojson", "alternatives": "3"}
    try:
        resp = await client.get(url, params=params)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("code") == "Ok":
                return data
    except httpx.RequestError:
        pass
    return None


async def _fetch_osrm(
    db: AsyncSession,
    origin_lat: float,
    origin_lon: float,
    dest_lat: float,
    dest_lon: float,
    profile: str,
) -> RouteAlternative:
    """Fetch route from free OSRM demo server with forced alternatives."""
    osrm_profile = _OSRM_PROFILE_MAP.get(profile, "driving")
    direct_coords = f"{origin_lon},{origin_lat};{dest_lon},{dest_lat}"

    transport = httpx.AsyncHTTPTransport(retries=2)
    async with httpx.AsyncClient(timeout=15, transport=transport) as client:
        data = await _osrm_call(client, osrm_profile, direct_coords)
        if data is None:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Route service unavailable. Try again later.",
            )

        osrm_routes = data.get("routes", [])

        # If OSRM returned < 3 routes, generate alternatives via offset waypoints
        if len(osrm_routes) < 3:
            dist_km = _haversine_km(origin_lat, origin_lon, dest_lat, dest_lon)
            offset_km = max(0.5, min(dist_km * 0.15, 3.0))
            waypoints = _perpendicular_waypoints(
                origin_lat, origin_lon, dest_lat, dest_lon, offset_km
            )
            seen_durations = {int(r.get("duration", 0)) for r in osrm_routes}

            for wp_lat, wp_lon in waypoints:
                if len(osrm_routes) >= 3:
                    break
                via_coords = (
                    f"{origin_lon},{origin_lat};"
                    f"{wp_lon},{wp_lat};"
                    f"{dest_lon},{dest_lat}"
                )
                via_data = await _osrm_call(client, osrm_profile, via_coords)
                if via_data and via_data.get("routes"):
                    via_route = via_data["routes"][0]
                    via_dur = int(via_route.get("duration", 0))
                    # Only add if travel time differs by at least 60s
                    if all(abs(via_dur - d) >= 60 for d in seen_durations):
                        osrm_routes.append(via_route)
                        seen_durations.add(via_dur)

    incidents_nearby = await _incidents_near_line(
        db, origin_lat, origin_lon, dest_lat, dest_lon
    )

    routes: list[RouteResponse] = []
    for osrm_route in osrm_routes:
        inc_count = len(incidents_nearby)
        risk_score = min(inc_count * 0.15, 1.0)
        routes.append(
            RouteResponse(
                geometry=osrm_route.get("geometry"),
                duration_seconds=int(osrm_route.get("duration", 0)),
                distance_meters=int(osrm_route.get("distance", 0)),
                incidents_on_route=incidents_nearby,
                risk_score=round(risk_score, 2),
            )
        )

    # Sort by duration (fastest first)
    routes.sort(key=lambda r: r.duration_seconds)
    return RouteAlternative(routes=routes)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance in km between two coordinates."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def _fetch_ors(
    db: AsyncSession,
    origin_lat: float,
    origin_lon: float,
    dest_lat: float,
    dest_lon: float,
    profile: str,
) -> RouteAlternative:
    """Fetch route from OpenRouteService (requires API key)."""
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

    incidents_nearby = await _incidents_near_line(
        db, origin_lat, origin_lon, dest_lat, dest_lon
    )
    risk_score = min(len(incidents_nearby) * 0.15, 1.0)

    routes: list[RouteResponse] = []
    for ors_route in ors_routes:
        summary = ors_route.get("summary", {})
        routes.append(
            RouteResponse(
                geometry=ors_route.get("geometry"),
                duration_seconds=int(summary.get("duration", 0)),
                distance_meters=int(summary.get("distance", 0)),
                incidents_on_route=incidents_nearby,
                risk_score=round(risk_score, 2),
            )
        )

    return RouteAlternative(routes=routes)


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
