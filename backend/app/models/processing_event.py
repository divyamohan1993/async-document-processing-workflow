from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    DateTime,
    Enum as SQLAlchemyEnum,
    ForeignKey,
    Integer,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.document import Document


class EventType(str, enum.Enum):
    JOB_QUEUED = "job_queued"
    JOB_STARTED = "job_started"
    DOCUMENT_PARSING_STARTED = "document_parsing_started"
    DOCUMENT_PARSING_COMPLETED = "document_parsing_completed"
    FIELD_EXTRACTION_STARTED = "field_extraction_started"
    FIELD_EXTRACTION_COMPLETED = "field_extraction_completed"
    JOB_COMPLETED = "job_completed"
    JOB_FAILED = "job_failed"


class ProcessingEvent(Base):
    __tablename__ = "processing_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("documents.id"), nullable=False, index=True
    )
    event_type: Mapped[EventType] = mapped_column(
        SQLAlchemyEnum(EventType), nullable=False
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    progress_percent: Mapped[int] = mapped_column(Integer, default=0)
    event_metadata: Mapped[Optional[dict]] = mapped_column(
        JSONB, default=dict, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    document: Mapped[Document] = relationship(back_populates="processing_events")
