import logging
from datetime import datetime, timezone

from celery import Celery
from celery.schedules import crontab
from sqlalchemy import create_engine, text

from app.core.config import settings

logger = logging.getLogger(__name__)

celery = Celery(
    "urban_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Sao_Paulo",
    enable_utc=True,
)

celery.conf.beat_schedule = {
    "expire-old-incidents": {
        "task": "app.tasks.celery_app.expire_old_incidents",
        "schedule": crontab(minute="*/5"),
    },
}


@celery.task
def expire_old_incidents():
    """Mark incidents past their expires_at as resolved."""
    engine = create_engine(settings.DATABASE_URL_SYNC)
    now = datetime.now(timezone.utc)
    with engine.connect() as conn:
        result = conn.execute(
            text(
                "UPDATE incidents SET status = 'resolved' "
                "WHERE status = 'open' AND expires_at IS NOT NULL AND expires_at <= :now"
            ),
            {"now": now},
        )
        conn.commit()
        count = result.rowcount
    engine.dispose()
    if count > 0:
        logger.info("Expired %d incidents", count)
    return {"expired": count}


@celery.task
def send_push_notification(user_id: int, title: str, body: str):
    """Send a push notification to the given user."""
    pass
