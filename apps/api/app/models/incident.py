from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func, Text, Index
from geoalchemy2 import Geometry

from app.core.database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String, nullable=False)  # enum: alagamento, tiroteio, etc
    severity = Column(String, nullable=False)  # baixa, media, alta
    status = Column(String, default="open")  # open, resolved, disputed
    description = Column(Text, nullable=True)
    photo_url = Column(String, nullable=True)
    geom = Column(Geometry("POINT", srid=4326), nullable=False)
    public_geom = Column(Geometry("POINT", srid=4326), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_incidents_geom", geom, postgresql_using="gist"),
        Index("idx_incidents_public_geom", public_geom, postgresql_using="gist"),
        Index("idx_incidents_status_type", status, type),
    )


class IncidentVote(Base):
    __tablename__ = "incident_votes"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    vote = Column(String, nullable=False)  # confirm, refute, resolved
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class IncidentComment(Base):
    __tablename__ = "incident_comments"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
