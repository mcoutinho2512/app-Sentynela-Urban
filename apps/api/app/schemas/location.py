"""Location request/response schemas with type-safe validation."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.enums import LocationType


class LocationCreate(BaseModel):
    label: str = Field(..., min_length=1, max_length=100)
    type: LocationType
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)


class LocationResponse(BaseModel):
    id: int
    label: str
    type: str
    lat: float
    lon: float
    is_private: bool
    created_at: datetime


class LocationUpdate(BaseModel):
    label: str | None = Field(None, min_length=1, max_length=100)
    lat: float | None = Field(None, ge=-90, le=90)
    lon: float | None = Field(None, ge=-180, le=180)
