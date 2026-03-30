import math
import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.document import (
    DocumentDetailResponse,
    DocumentResponse,
    DocumentUpdateRequest,
)
from app.services.document_service import DocumentService
from app.services.export_service import ExportService

router = APIRouter()


@router.post(
    "/upload",
    response_model=list[DocumentResponse],
    status_code=status.HTTP_201_CREATED,
)
async def upload_documents(
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DocumentResponse]:
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided",
        )
    service = DocumentService(db)
    documents = await service.upload_documents(
        files=files, user_id=current_user.id
    )
    return [DocumentResponse.model_validate(doc) for doc in documents]


@router.get("", response_model=PaginatedResponse[DocumentResponse])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    search: Optional[str] = Query(default=None, max_length=255),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    sort_by: str = Query(default="created_at", pattern="^(created_at|filename|status|file_size)$"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> PaginatedResponse[DocumentResponse]:
    service = DocumentService(db)
    documents, total = await service.list_documents(
        user_id=current_user.id,
        search=search,
        status_filter=status_filter,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    return PaginatedResponse(
        items=[DocumentResponse.model_validate(doc) for doc in documents],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/export")
async def export_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    format: str = Query(default="json", pattern="^(json|csv)$"),
    document_ids: Optional[str] = Query(default=None),
) -> StreamingResponse:
    parsed_ids: list[uuid.UUID] | None = None
    if document_ids:
        try:
            parsed_ids = [uuid.UUID(did.strip()) for did in document_ids.split(",")]
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid document ID format",
            )
    service = ExportService(db)
    content, media_type, filename = await service.export_finalized(
        user_id=current_user.id,
        format=format,
        document_ids=parsed_ids,
    )
    return StreamingResponse(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{document_id}", response_model=DocumentDetailResponse)
async def get_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentDetailResponse:
    service = DocumentService(db)
    document = await service.get_document(
        document_id=document_id, user_id=current_user.id
    )
    return DocumentDetailResponse.model_validate(document)


@router.put("/{document_id}", response_model=DocumentDetailResponse)
async def update_document(
    document_id: uuid.UUID,
    body: DocumentUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentDetailResponse:
    service = DocumentService(db)
    document = await service.update_processing_result(
        document_id=document_id,
        user_id=current_user.id,
        update_data=body,
    )
    return DocumentDetailResponse.model_validate(document)


@router.post("/{document_id}/finalize", response_model=DocumentDetailResponse)
async def finalize_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentDetailResponse:
    service = DocumentService(db)
    document = await service.finalize_document(
        document_id=document_id, user_id=current_user.id
    )
    return DocumentDetailResponse.model_validate(document)


@router.post("/{document_id}/retry", response_model=DocumentResponse)
async def retry_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentResponse:
    service = DocumentService(db)
    document = await service.retry_document(
        document_id=document_id, user_id=current_user.id
    )
    return DocumentResponse.model_validate(document)
