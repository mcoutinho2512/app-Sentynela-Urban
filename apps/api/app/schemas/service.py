"""Service listing schemas with validation."""

from datetime import datetime

from pydantic import BaseModel, Field


class ServiceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    category: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(None, max_length=2000)
    phone: str | None = Field(None, max_length=20)
    whatsapp: str | None = Field(None, max_length=20)
    hours: str | None = Field(None, max_length=200)
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
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


class ServiceUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    category: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = Field(None, max_length=2000)
    phone: str | None = Field(None, max_length=20)
    whatsapp: str | None = Field(None, max_length=20)
    hours: str | None = Field(None, max_length=200)
    lat: float | None = Field(None, ge=-90, le=90)
    lon: float | None = Field(None, ge=-180, le=180)
    images: list[str] | None = None


class ServiceListResponse(BaseModel):
    services: list[ServiceResponse]
    total: int
