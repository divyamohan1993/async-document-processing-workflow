import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.processing import ProcessingEventResponse, ProcessingResultResponse


class DocumentResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    status: str
    celery_task_id: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentDetailResponse(DocumentResponse):
    processing_result: Optional[ProcessingResultResponse] = None
    processing_events: list[ProcessingEventResponse] = []


class DocumentUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, max_length=500)
    category: Optional[str] = Field(default=None, max_length=255)
    summary: Optional[str] = None
    keywords: Optional[list[str]] = None


class DocumentListParams(BaseModel):
    search: Optional[str] = None
    status: Optional[str] = None
    sort_by: str = Field(default="created_at", pattern="^(created_at|filename|status|file_size)$")
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$")
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
