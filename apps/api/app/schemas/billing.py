from datetime import datetime

from pydantic import BaseModel


class SubscribeRequest(BaseModel):
    plan: str


class SubscriptionResponse(BaseModel):
    id: int
    plan: str
    status: str
    current_period_end: datetime | None = None
