from datetime import datetime

from pydantic import BaseModel


class IncidentCreate(BaseModel):
    type: str
    severity: str
    description: str | None = None
    photo_url: str | None = None
    lat: float
    lon: float


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
    vote: str


class IncidentCommentCreate(BaseModel):
    text: str


class IncidentCommentResponse(BaseModel):
    id: int
    incident_id: int
    user_id: int
    user_name: str
    text: str
    created_at: datetime
