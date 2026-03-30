import json
import time
import uuid
from datetime import datetime, timezone

import redis as sync_redis
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.models.document import Document, DocumentStatus
from app.models.processing_event import EventType, ProcessingEvent
from app.models.processing_result import ProcessingResult
from app.utils.text_extractor import (
    determine_category,
    extract_keywords,
    extract_text,
    extract_title,
    generate_summary,
)
from app.workers.celery_app import celery_app

# Synchronous engine for Celery workers
sync_engine = create_engine(
    settings.DATABASE_SYNC_URL,
    pool_size=5,
    max_overflow=5,
    pool_pre_ping=True,
)
SyncSessionFactory = sessionmaker(bind=sync_engine, expire_on_commit=False)

# Synchronous Redis client for pub/sub
redis_client = sync_redis.from_url(settings.REDIS_URL, decode_responses=True)


def publish_progress(
    document_id: str,
    event_type: str,
    message: str,
    progress_percent: int,
    metadata: dict | None = None,
) -> None:
    """Publish a progress event to Redis Pub/Sub and store in DB."""
    channel = f"document:{document_id}:progress"
    event_data = {
        "event_type": event_type,
        "message": message,
        "progress_percent": progress_percent,
        "document_id": document_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "metadata": metadata or {},
    }
    redis_client.publish(channel, json.dumps(event_data))


def store_event(
    session: Session,
    document_id: uuid.UUID,
    event_type: EventType,
    message: str,
    progress_percent: int,
    metadata: dict | None = None,
) -> None:
    """Store a processing event in the database."""
    event = ProcessingEvent(
        document_id=document_id,
        event_type=event_type,
        message=message,
        progress_percent=progress_percent,
        metadata=metadata or {},
    )
    session.add(event)
    session.commit()


@celery_app.task(
    name="app.workers.tasks.process_document",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
)
def process_document(self, document_id: str) -> dict:
    """Main document processing task."""
    doc_uuid = uuid.UUID(document_id)
    session = SyncSessionFactory()

    try:
        # Fetch document
        document = session.query(Document).filter(Document.id == doc_uuid).first()
        if document is None:
            raise ValueError(f"Document {document_id} not found")

        # ---- Stage 1: Job Started (0%) ----
        document.status = DocumentStatus.PROCESSING
        session.commit()

        store_event(
            session, doc_uuid, EventType.JOB_STARTED,
            "Processing job started", 0,
        )
        publish_progress(
            document_id, EventType.JOB_STARTED.value,
            "Processing job started", 0,
        )
        time.sleep(0.5)

        # ---- Stage 2: Document Parsing Started (15%) ----
        store_event(
            session, doc_uuid, EventType.DOCUMENT_PARSING_STARTED,
            "Reading and parsing document", 15,
        )
        publish_progress(
            document_id, EventType.DOCUMENT_PARSING_STARTED.value,
            "Reading and parsing document", 15,
        )
        time.sleep(1.0)

        # ---- Stage 3: Document Parsing Completed (35%) ----
        raw_text = extract_text(document.file_path, document.file_type)
        text_length = len(raw_text) if raw_text else 0

        store_event(
            session, doc_uuid, EventType.DOCUMENT_PARSING_COMPLETED,
            f"Document parsed successfully. Extracted {text_length} characters.",
            35,
            metadata={"text_length": text_length},
        )
        publish_progress(
            document_id, EventType.DOCUMENT_PARSING_COMPLETED.value,
            f"Document parsed successfully. Extracted {text_length} characters.",
            35,
            metadata={"text_length": text_length},
        )
        time.sleep(1.5)

        # ---- Stage 4: Field Extraction Started (50%) ----
        store_event(
            session, doc_uuid, EventType.FIELD_EXTRACTION_STARTED,
            "Extracting structured fields from document", 50,
        )
        publish_progress(
            document_id, EventType.FIELD_EXTRACTION_STARTED.value,
            "Extracting structured fields from document", 50,
        )
        time.sleep(1.0)

        # ---- Stage 5: Field Extraction Completed (75%) ----
        title = extract_title(raw_text, document.original_filename)
        category = determine_category(document.file_type, raw_text)
        summary = generate_summary(raw_text)
        keywords = extract_keywords(raw_text)

        structured_data = {
            "word_count": len(raw_text.split()) if raw_text else 0,
            "char_count": text_length,
            "line_count": raw_text.count("\n") + 1 if raw_text else 0,
            "file_type": document.file_type,
            "original_filename": document.original_filename,
        }

        # Create or update processing result
        processing_result = (
            session.query(ProcessingResult)
            .filter(ProcessingResult.document_id == doc_uuid)
            .first()
        )
        if processing_result is None:
            processing_result = ProcessingResult(document_id=doc_uuid)
            session.add(processing_result)

        processing_result.title = title
        processing_result.category = category
        processing_result.summary = summary
        processing_result.keywords = keywords
        processing_result.raw_text = raw_text
        processing_result.structured_data = structured_data
        session.commit()

        store_event(
            session, doc_uuid, EventType.FIELD_EXTRACTION_COMPLETED,
            f"Extracted fields: title='{title}', category='{category}', {len(keywords)} keywords",
            75,
            metadata={
                "title": title,
                "category": category,
                "keyword_count": len(keywords),
            },
        )
        publish_progress(
            document_id, EventType.FIELD_EXTRACTION_COMPLETED.value,
            f"Extracted fields: title='{title}', category='{category}', {len(keywords)} keywords",
            75,
            metadata={
                "title": title,
                "category": category,
                "keyword_count": len(keywords),
            },
        )
        time.sleep(0.5)

        # ---- Stage 6: Job Completed (100%) ----
        document.status = DocumentStatus.COMPLETED
        document.error_message = None
        session.commit()

        store_event(
            session, doc_uuid, EventType.JOB_COMPLETED,
            "Document processing completed successfully", 100,
        )
        publish_progress(
            document_id, EventType.JOB_COMPLETED.value,
            "Document processing completed successfully", 100,
        )

        return {
            "document_id": document_id,
            "status": "completed",
            "title": title,
            "category": category,
        }

    except Exception as exc:
        session.rollback()

        # Update document status to FAILED
        try:
            document = session.query(Document).filter(Document.id == doc_uuid).first()
            if document:
                document.status = DocumentStatus.FAILED
                document.error_message = str(exc)[:1000]
                session.commit()

                store_event(
                    session, doc_uuid, EventType.JOB_FAILED,
                    f"Processing failed: {str(exc)[:500]}", 0,
                    metadata={"error": str(exc)[:1000]},
                )
                publish_progress(
                    document_id, EventType.JOB_FAILED.value,
                    f"Processing failed: {str(exc)[:500]}", 0,
                    metadata={"error": str(exc)[:1000]},
                )
        except Exception:
            pass  # Best-effort error recording

        raise exc

    finally:
        session.close()
