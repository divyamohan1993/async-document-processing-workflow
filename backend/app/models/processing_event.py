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
    job_queued = "job_queued"
    job_started = "job_started"
    document_parsing_started = "document_parsing_started"
    document_parsing_completed = "document_parsing_completed"
    field_extraction_started = "field_extraction_started"
    field_extraction_completed = "field_extraction_completed"
    job_completed = "job_completed"
    job_failed = "job_failed"


class ProcessingEvent(Base):
    __tablename__ = "processing_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("documents.id"), nullable=False, index=True
    )
    event_type: Mapped[EventType] = mapped_column(
        SQLAlchemyEnum(
            EventType,
            values_callable=lambda e: [x.value for x in e],
            create_constraint=False,
            native_enum=False,
            length=50,
        ),
        nullable=False
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
