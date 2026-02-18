from datetime import datetime

from pydantic import BaseModel


class AlertPreferenceCreate(BaseModel):
    mode: str
    neighborhood_name: str | None = None
    center_lat: float | None = None
    center_lon: float | None = None
    radius_km: float | None = None
    types: list[str] | None = None
    min_severity: str = "baixa"
    enabled: bool = True


class AlertPreferenceResponse(BaseModel):
    id: int
    user_id: int
    mode: str
    neighborhood_name: str | None = None
    center_lat: float | None = None
    center_lon: float | None = None
    radius_km: float | None = None
    types: list[str] | None = None
    min_severity: str
    enabled: bool


class AlertFeedItem(BaseModel):
    incident_id: int
    type: str
    severity: str
    description: str | None = None
    lat: float
    lon: float
    distance_km: float
    created_at: datetime
