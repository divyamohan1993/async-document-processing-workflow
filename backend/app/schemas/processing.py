import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ProcessingResultResponse(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    title: Optional[str] = None
    category: Optional[str] = None
    summary: Optional[str] = None
    keywords: Optional[list[str]] = None
    raw_text: Optional[str] = None
    structured_data: Optional[dict] = None
    is_finalized: bool
    finalized_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProcessingEventResponse(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    event_type: str
    message: str
    progress_percent: int
    metadata: Optional[dict] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProgressSSEData(BaseModel):
    event_type: str
    message: str
    progress_percent: int
    document_id: str
    timestamp: str
