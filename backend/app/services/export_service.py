import csv
import io
import json
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.document import Document, DocumentStatus
from app.models.processing_result import ProcessingResult


class ExportService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def export_finalized(
        self,
        user_id: uuid.UUID,
        format: str = "json",
        document_ids: Optional[list[uuid.UUID]] = None,
    ) -> tuple[io.BytesIO, str, str]:
        query = (
            select(Document)
            .where(Document.user_id == user_id)
            .options(selectinload(Document.processing_result))
            .join(Document.processing_result)
            .where(ProcessingResult.is_finalized == True)
        )

        if document_ids:
            query = query.where(Document.id.in_(document_ids))

        result = await self.db.execute(query)
        documents = list(result.scalars().all())

        if not documents:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No finalized documents found matching the criteria",
            )

        if format == "json":
            return self._export_json(documents)
        elif format == "csv":
            return self._export_csv(documents)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported export format: {format}",
            )

    def _export_json(
        self, documents: list[Document]
    ) -> tuple[io.BytesIO, str, str]:
        export_data = []
        for doc in documents:
            pr = doc.processing_result
            export_data.append(
                {
                    "document_id": str(doc.id),
                    "original_filename": doc.original_filename,
                    "file_type": doc.file_type,
                    "file_size": doc.file_size,
                    "status": doc.status.value if doc.status else None,
                    "title": pr.title if pr else None,
                    "category": pr.category if pr else None,
                    "summary": pr.summary if pr else None,
                    "keywords": pr.keywords if pr else None,
                    "finalized_at": (
                        pr.finalized_at.isoformat() if pr and pr.finalized_at else None
                    ),
                    "created_at": doc.created_at.isoformat() if doc.created_at else None,
                }
            )

        content = json.dumps(export_data, indent=2, default=str).encode("utf-8")
        buffer = io.BytesIO(content)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        return buffer, "application/json", f"export_{timestamp}.json"

    def _export_csv(
        self, documents: list[Document]
    ) -> tuple[io.BytesIO, str, str]:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "document_id",
                "original_filename",
                "file_type",
                "file_size",
                "status",
                "title",
                "category",
                "summary",
                "keywords",
                "finalized_at",
                "created_at",
            ]
        )

        for doc in documents:
            pr = doc.processing_result
            writer.writerow(
                [
                    str(doc.id),
                    doc.original_filename,
                    doc.file_type,
                    doc.file_size,
                    doc.status.value if doc.status else "",
                    pr.title if pr else "",
                    pr.category if pr else "",
                    pr.summary if pr else "",
                    ",".join(pr.keywords) if pr and pr.keywords else "",
                    (
                        pr.finalized_at.isoformat()
                        if pr and pr.finalized_at
                        else ""
                    ),
                    doc.created_at.isoformat() if doc.created_at else "",
                ]
            )

        content = output.getvalue().encode("utf-8")
        buffer = io.BytesIO(content)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        return buffer, "text/csv", f"export_{timestamp}.csv"
