from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "docprocess",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_reject_on_worker_lost=True,
    task_track_started=True,
    task_routes={
        "app.workers.tasks.process_document": {"queue": "document_processing"},
    },
    task_default_queue="default",
    task_queues={
        "default": {},
        "document_processing": {},
    },
)

celery_app.autodiscover_tasks(["app.workers"])
