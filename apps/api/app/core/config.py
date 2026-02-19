from pydantic import ConfigDict, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", env_file_encoding="utf-8")

    # ---------- Database ----------
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/urban"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/urban"
    REDIS_URL: str = "redis://localhost:6379/0"

    # ---------- JWT ----------
    JWT_SECRET: str  # REQUIRED - no default, must be set via env
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ---------- External APIs ----------
    OPENROUTESERVICE_API_KEY: str = ""

    # ---------- CORS ----------
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # ---------- Incident rules ----------
    INCIDENT_RATE_LIMIT_PER_HOUR: int = 5
    INCIDENT_DUPLICATE_RADIUS_M: int = 50
    INCIDENT_DUPLICATE_WINDOW_MIN: int = 10

    # ---------- Reputation ----------
    REPUTATION_CONFIRM_BONUS: int = 2
    REPUTATION_REFUTE_PENALTY: int = 3
    REPUTATION_RESOLVE_BONUS: int = 5
    REPUTATION_THRESHOLD_CONFIRMATIONS: int = 3
    REPUTATION_THRESHOLD_REFUTATIONS: int = 3

    # ---------- Uploads ----------
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024  # 5MB

    # ---------- Rate limits ----------
    LOGIN_RATE_LIMIT: int = 10  # per window
    LOGIN_RATE_WINDOW: int = 900  # 15 minutes
    REGISTER_RATE_LIMIT: int = 5
    REGISTER_RATE_WINDOW: int = 3600  # 1 hour

    @field_validator("JWT_SECRET")
    @classmethod
    def jwt_secret_must_be_strong(cls, v: str) -> str:
        weak = {"change-me-in-production", "secret", "dev-jwt-secret-change-in-production", ""}
        if v in weak:
            raise ValueError("JWT_SECRET must be set to a strong, unique value")
        if len(v) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters")
        return v


settings = Settings()
