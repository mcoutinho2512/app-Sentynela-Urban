"""LGPD consent schemas."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class ConsentType(str, Enum):
    terms = "terms"
    privacy = "privacy"
    data_processing = "data_processing"
    marketing = "marketing"


class ConsentCreate(BaseModel):
    consent_type: ConsentType
    version: str = Field(..., min_length=1, max_length=20)
    accepted: bool


class ConsentResponse(BaseModel):
    id: int
    consent_type: str
    version: str
    accepted: bool
    created_at: datetime
