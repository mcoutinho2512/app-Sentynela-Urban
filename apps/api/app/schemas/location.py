from datetime import datetime

from pydantic import BaseModel


class LocationCreate(BaseModel):
    label: str
    type: str
    lat: float
    lon: float


class LocationResponse(BaseModel):
    id: int
    label: str
    type: str
    lat: float
    lon: float
    is_private: bool
    created_at: datetime


class LocationUpdate(BaseModel):
    label: str | None = None
    lat: float | None = None
    lon: float | None = None
