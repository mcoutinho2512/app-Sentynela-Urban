from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, func, ARRAY, Float
from geoalchemy2 import Geometry

from app.core.database import Base


class AlertPreference(Base):
    __tablename__ = "alert_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    mode = Column(String, nullable=False)  # neighborhood, radius
    neighborhood_name = Column(String, nullable=True)
    center_geom = Column(Geometry("POINT", srid=4326), nullable=True)
    radius_km = Column(Float, nullable=True)
    types = Column(ARRAY(String), nullable=True)
    min_severity = Column(String, default="baixa")
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
