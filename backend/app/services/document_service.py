import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.document import Document, DocumentStatus
from app.models.processing_event import EventType, ProcessingEvent
from app.models.processing_result import ProcessingResult
from app.schemas.document import DocumentUpdateRequest
from app.utils.file_handler import FileHandler


class DocumentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.file_handler = FileHandler()

    async def upload_documents(
        self, files: list[UploadFile], user_id: uuid.UUID
    ) -> list[Document]:
        documents = []
        for file in files:
            # Validate and save file
            file_info = await self.file_handler.save_upload(file)

            document = Document(
                user_id=user_id,
                filename=file_info["filename"],
                original_filename=file_info["original_filename"],
                file_type=file_info["file_type"],
                file_size=file_info["file_size"],
                file_path=file_info["file_path"],
                status=DocumentStatus.queued,
            )
            self.db.add(document)
            await self.db.flush()
            await self.db.refresh(document)

            # Create initial queued event
            event = ProcessingEvent(
                document_id=document.id,
                event_type=EventType.job_queued,
                message=f"Document '{file_info['original_filename']}' queued for processing",
                progress_percent=0,
            )
            self.db.add(event)

            # Dispatch Celery task
            from app.workers.tasks import process_document

            task = process_document.delay(str(document.id))
            document.celery_task_id = task.id
            await self.db.flush()
            await self.db.refresh(document)

            documents.append(document)

        return documents

    async def list_documents(
        self,
        user_id: uuid.UUID,
        search: Optional[str] = None,
        status_filter: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Document], int]:
        base_query = select(Document).where(Document.user_id == user_id)
        count_query = select(func.count(Document.id)).where(
            Document.user_id == user_id
        )

        if search:
            search_filter = Document.original_filename.ilike(f"%{search}%")
            base_query = base_query.where(search_filter)
            count_query = count_query.where(search_filter)

        if status_filter:
            try:
                status_enum = DocumentStatus(status_filter)
                base_query = base_query.where(Document.status == status_enum)
                count_query = count_query.where(Document.status == status_enum)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status: {status_filter}",
                )

        # Sort
        sort_column = getattr(Document, sort_by, Document.created_at)
        if sort_order == "desc":
            base_query = base_query.order_by(sort_column.desc())
        else:
            base_query = base_query.order_by(sort_column.asc())

        # Pagination
        offset = (page - 1) * page_size
        base_query = base_query.offset(offset).limit(page_size)

        # Execute
        result = await self.db.execute(base_query)
        documents = list(result.scalars().all())

        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        return documents, total

    async def get_document(
        self, document_id: uuid.UUID, user_id: uuid.UUID
    ) -> Document:
        result = await self.db.execute(
            select(Document)
            .where(Document.id == document_id, Document.user_id == user_id)
            .options(
                selectinload(Document.processing_result),
                selectinload(Document.processing_events),
            )
        )
        document = result.scalar_one_or_none()
        if document is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found",
            )
        return document

    async def update_processing_result(
        self,
        document_id: uuid.UUID,
        user_id: uuid.UUID,
        update_data: DocumentUpdateRequest,
    ) -> Document:
        document = await self.get_document(document_id, user_id)

        if document.processing_result is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document has no processing result yet",
            )

        if document.processing_result.is_finalized:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot update a finalized document",
            )

        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(document.processing_result, key, value)

        await self.db.flush()
        await self.db.refresh(document)
        return document

    async def finalize_document(
        self, document_id: uuid.UUID, user_id: uuid.UUID
    ) -> Document:
        document = await self.get_document(document_id, user_id)

        if document.status != DocumentStatus.completed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only finalize completed documents",
            )

        if document.processing_result is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document has no processing result",
            )

        if document.processing_result.is_finalized:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document is already finalized",
            )

        document.processing_result.is_finalized = True
        document.processing_result.finalized_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(document)
        return document

    async def retry_document(
        self, document_id: uuid.UUID, user_id: uuid.UUID
    ) -> Document:
        document = await self.get_document(document_id, user_id)

        if document.status != DocumentStatus.failed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only retry failed documents",
            )

        document.status = DocumentStatus.queued
        document.error_message = None
        document.retry_count += 1

        # Create retry event
        event = ProcessingEvent(
            document_id=document.id,
            event_type=EventType.job_queued,
            message=f"Document retry #{document.retry_count} queued",
            progress_percent=0,
        )
        self.db.add(event)
        await self.db.flush()

        # Dispatch new Celery task
        from app.workers.tasks import process_document

        task = process_document.delay(str(document.id))
        document.celery_task_id = task.id
        await self.db.flush()
        await self.db.refresh(document)

        return document
