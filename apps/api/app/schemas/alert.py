"""Alert preference schemas with validation."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.enums import IncidentType, Severity


class AlertPreferenceCreate(BaseModel):
    mode: str = Field(..., pattern="^(radius|neighborhood)$")
    neighborhood_name: str | None = Field(None, max_length=200)
    center_lat: float | None = Field(None, ge=-90, le=90)
    center_lon: float | None = Field(None, ge=-180, le=180)
    radius_km: float | None = Field(None, ge=0.1, le=50)
    types: list[IncidentType] | None = None
    min_severity: Severity = Severity.baixa
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
