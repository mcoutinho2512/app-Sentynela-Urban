from datetime import datetime

from pydantic import BaseModel


class ServiceCreate(BaseModel):
    name: str
    category: str
    description: str | None = None
    phone: str | None = None
    whatsapp: str | None = None
    hours: str | None = None
    lat: float
    lon: float
    images: list[str] | None = None


class ServiceResponse(BaseModel):
    id: int
    user_id: int
    name: str
    category: str
    description: str | None = None
    phone: str | None = None
    whatsapp: str | None = None
    hours: str | None = None
    lat: float
    lon: float
    images: list[str]
    status: str
    plan_level: str
    created_at: datetime


class ServiceListResponse(BaseModel):
    services: list[ServiceResponse]
    total: int
