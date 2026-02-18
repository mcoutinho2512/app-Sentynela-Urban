from typing import Any

from pydantic import BaseModel


class CommuteRequest(BaseModel):
    profile: str = "driving-car"


class CustomRouteRequest(BaseModel):
    origin_lat: float
    origin_lon: float
    dest_lat: float
    dest_lon: float
    profile: str = "driving-car"


class RouteResponse(BaseModel):
    geometry: Any | None = None
    duration_seconds: int
    distance_meters: int
    incidents_on_route: list[dict]
    risk_score: float


class RouteAlternative(BaseModel):
    routes: list[RouteResponse]
