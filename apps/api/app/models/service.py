from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func, ARRAY, Text
from geoalchemy2 import Geometry

from app.core.database import Base


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_level = Column(String, nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    phone = Column(String, nullable=True)
    whatsapp = Column(String, nullable=True)
    hours = Column(String, nullable=True)
    geom = Column(Geometry("POINT", srid=4326), nullable=False)
    images = Column(ARRAY(String), default=[])
    status = Column(String, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
