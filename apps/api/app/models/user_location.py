from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, func
from geoalchemy2 import Geometry

from app.core.database import Base


class UserLocation(Base):
    __tablename__ = "user_locations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    label = Column(String, nullable=False)
    type = Column(String, nullable=False)  # home, work, favorite
    geom = Column(Geometry("POINT", srid=4326), nullable=False)
    is_private = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
