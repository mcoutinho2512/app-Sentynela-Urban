"""LGPD user consent tracking model."""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func, Text

from app.core.database import Base


class UserConsent(Base):
    __tablename__ = "user_consents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    consent_type = Column(String, nullable=False)  # terms, privacy, data_processing, marketing
    version = Column(String, nullable=False)  # e.g. "1.0", "2.0"
    accepted = Column(Boolean, nullable=False, default=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
