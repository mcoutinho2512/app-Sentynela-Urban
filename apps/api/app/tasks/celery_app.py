from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

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
    pass


@celery.task
def send_push_notification(user_id: int, title: str, body: str):
    """Send a push notification to the given user."""
    pass
