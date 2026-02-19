"""Incident request/response schemas with type-safe validation."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.enums import IncidentType, Severity, VoteType


class IncidentCreate(BaseModel):
    type: IncidentType
    severity: Severity
    description: str | None = Field(None, max_length=2000)
    photo_url: str | None = Field(None, max_length=500)
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)


class IncidentResponse(BaseModel):
    id: int
    user_id: int
    type: str
    severity: str
    status: str
    description: str | None = None
    photo_url: str | None = None
    lat: float
    lon: float
    created_at: datetime
    expires_at: datetime | None = None
    confirmations: int
    refutations: int
    user_vote: str | None = None


class IncidentListResponse(BaseModel):
    incidents: list[IncidentResponse]
    total: int


class IncidentVoteCreate(BaseModel):
    vote: VoteType


class IncidentCommentCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)


class IncidentCommentResponse(BaseModel):
    id: int
    incident_id: int
    user_id: int
    user_name: str
    text: str
    created_at: datetime
