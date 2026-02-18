from sqlalchemy import Column, Integer, String, DateTime, func

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    role = Column(String, default="free")  # free, pro, business, admin
    reputation = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
