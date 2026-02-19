"""Route request/response schemas with type-safe validation."""

from typing import Any

from pydantic import BaseModel, Field

from app.schemas.enums import RouteProfile


class CommuteRequest(BaseModel):
    profile: RouteProfile = RouteProfile.driving_car


class CustomRouteRequest(BaseModel):
    origin_lat: float = Field(..., ge=-90, le=90)
    origin_lon: float = Field(..., ge=-180, le=180)
    dest_lat: float = Field(..., ge=-90, le=90)
    dest_lon: float = Field(..., ge=-180, le=180)
    profile: RouteProfile = RouteProfile.driving_car


class RouteResponse(BaseModel):
    geometry: Any | None = None
    duration_seconds: int
    distance_meters: int
    incidents_on_route: list[dict]
    risk_score: float


class RouteAlternative(BaseModel):
    routes: list[RouteResponse]
