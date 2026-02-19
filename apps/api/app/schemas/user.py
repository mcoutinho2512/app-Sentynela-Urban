"""User request/response schemas with validation."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    name: str = Field(..., min_length=1, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str
    avatar_url: str | None = None
    role: str
    reputation: int
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


class UserUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    avatar_url: str | None = Field(None, max_length=500)


class RefreshRequest(BaseModel):
    refresh_token: str
