import io
import os
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.document import Document, DocumentStatus
from app.models.processing_event import EventType, ProcessingEvent
from app.models.processing_result import ProcessingResult
from app.models.user import User


async def _create_document(
    db_session: AsyncSession,
    user_id: uuid.UUID,
    status: DocumentStatus = DocumentStatus.completed,
    original_filename: str = "test.txt",
    file_type: str = "txt",
    with_result: bool = True,
    is_finalized: bool = False,
) -> Document:
    doc = Document(
        id=uuid.uuid4(),
        user_id=user_id,
        filename=f"{uuid.uuid4()}.{file_type}",
        original_filename=original_filename,
        file_type=file_type,
        file_size=1024,
        file_path=f"/tmp/test_{uuid.uuid4()}.{file_type}",
        status=status,
        retry_count=0,
    )
    db_session.add(doc)
    await db_session.flush()

    if with_result:
        result = ProcessingResult(
            document_id=doc.id,
            title="Test Document Title",
            category="General Document",
            summary="This is a test summary.",
            keywords=["test", "document"],
            raw_text="This is the raw text content of the test document.",
            structured_data={"word_count": 10},
            is_finalized=is_finalized,
        )
        db_session.add(result)

    event = ProcessingEvent(
        document_id=doc.id,
        event_type=EventType.job_queued,
        message="Queued",
        progress_percent=0,
    )
    db_session.add(event)
    await db_session.commit()
    await db_session.refresh(doc)
    return doc


@pytest.mark.asyncio
async def test_upload_document(client: AsyncClient, auth_headers: dict):
    # Ensure upload dir exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    file_content = b"Hello, this is a test document with some content."
    files = [("files", ("test.txt", io.BytesIO(file_content), "text/plain"))]
    response = await client.post(
        "/api/v1/documents/upload",
        files=files,
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert len(data) == 1
    assert data[0]["original_filename"] == "test.txt"
    assert data[0]["file_type"] == "txt"
    assert data[0]["status"] == "queued"


@pytest.mark.asyncio
async def test_upload_invalid_file_type(client: AsyncClient, auth_headers: dict):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    files = [("files", ("test.exe", io.BytesIO(b"binary"), "application/octet-stream"))]
    response = await client.post(
        "/api/v1/documents/upload",
        files=files,
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert "not allowed" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_upload_empty_file(client: AsyncClient, auth_headers: dict):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    files = [("files", ("empty.txt", io.BytesIO(b""), "text/plain"))]
    response = await client.post(
        "/api/v1/documents/upload",
        files=files,
        headers=auth_headers,
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_list_documents(
    client: AsyncClient,
    auth_headers: dict,
    test_user: User,
    db_session: AsyncSession,
):
    await _create_document(db_session, test_user.id, original_filename="alpha.txt")
    await _create_document(db_session, test_user.id, original_filename="beta.txt")

    response = await client.get("/api/v1/documents", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 2
    assert len(data["items"]) >= 2


@pytest.mark.asyncio
async def test_list_documents_with_search(
    client: AsyncClient,
    auth_headers: dict,
    test_user: User,
    db_session: AsyncSession,
):
    await _create_document(db_session, test_user.id, original_filename="unique_searchable.txt")

    response = await client.get(
        "/api/v1/documents?search=unique_searchable",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert any("unique_searchable" in item["original_filename"] for item in data["items"])


@pytest.mark.asyncio
async def test_list_documents_with_status_filter(
    client: AsyncClient,
    auth_headers: dict,
    test_user: User,
    db_session: AsyncSession,
):
    await _create_document(db_session, test_user.id, status=DocumentStatus.failed)

    response = await client.get(
        "/api/v1/documents?status=failed",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert all(item["status"] == "failed" for item in data["items"])


@pytest.mark.asyncio
async def test_get_document_detail(
    client: AsyncClient,
    auth_headers: dict,
    test_user: User,
    db_session: AsyncSession,
):
    doc = await _create_document(db_session, test_user.id)

    response = await client.get(
        f"/api/v1/documents/{doc.id}", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(doc.id)
    assert data["processing_result"] is not None
    assert data["processing_result"]["title"] == "Test Document Title"
    assert len(data["processing_events"]) >= 1


@pytest.mark.asyncio
async def test_get_document_not_found(client: AsyncClient, auth_headers: dict):
    fake_id = uuid.uuid4()
    response = await client.get(
        f"/api/v1/documents/{fake_id}", headers=auth_headers
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_document(
    client: AsyncClient,
    auth_headers: dict,
    test_user: User,
    db_session: AsyncSession,
):
    doc = await _create_document(db_session, test_user.id)

    response = await client.put(
        f"/api/v1/documents/{doc.id}",
        json={
            "title": "Updated Title",
            "category": "Report",
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["processing_result"]["title"] == "Updated Title"
    assert data["processing_result"]["category"] == "Report"


@pytest.mark.asyncio
async def test_update_finalized_document_fails(
    client: AsyncClient,
    auth_headers: dict,
    test_user: User,
    db_session: AsyncSession,
):
    doc = await _create_document(db_session, test_user.id, is_finalized=True)

    response = await client.put(
        f"/api/v1/documents/{doc.id}",
        json={"title": "Should Fail"},
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert "finalized" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_finalize_document(
    client: AsyncClient,
    auth_headers: dict,
    test_user: User,
    db_session: AsyncSession,
):
    doc = await _create_document(db_session, test_user.id, status=DocumentStatus.completed)

    response = await client.post(
        f"/api/v1/documents/{doc.id}/finalize", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["processing_result"]["is_finalized"] is True
    assert data["processing_result"]["finalized_at"] is not None


@pytest.mark.asyncio
async def test_finalize_non_completed_fails(
    client: AsyncClient,
    auth_headers: dict,
    test_user: User,
    db_session: AsyncSession,
):
    doc = await _create_document(db_session, test_user.id, status=DocumentStatus.queued)

    response = await client.post(
        f"/api/v1/documents/{doc.id}/finalize", headers=auth_headers
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_retry_failed_document(
    client: AsyncClient,
    auth_headers: dict,
    test_user: User,
    db_session: AsyncSession,
):
    doc = await _create_document(db_session, test_user.id, status=DocumentStatus.failed)

    response = await client.post(
        f"/api/v1/documents/{doc.id}/retry", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "queued"
    assert data["retry_count"] == 1


@pytest.mark.asyncio
async def test_retry_non_failed_fails(
    client: AsyncClient,
    auth_headers: dict,
    test_user: User,
    db_session: AsyncSession,
):
    doc = await _create_document(db_session, test_user.id, status=DocumentStatus.completed)

    response = await client.post(
        f"/api/v1/documents/{doc.id}/retry", headers=auth_headers
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_export_json(
    client: AsyncClient,
    auth_headers: dict,
    test_user: User,
    db_session: AsyncSession,
):
    await _create_document(
        db_session, test_user.id,
        status=DocumentStatus.completed,
        is_finalized=True,
    )

    response = await client.get(
        "/api/v1/documents/export?format=json", headers=auth_headers
    )
    assert response.status_code == 200
    assert "application/json" in response.headers.get("content-type", "")


@pytest.mark.asyncio
async def test_export_csv(
    client: AsyncClient,
    auth_headers: dict,
    test_user: User,
    db_session: AsyncSession,
):
    await _create_document(
        db_session, test_user.id,
        status=DocumentStatus.completed,
        is_finalized=True,
    )

    response = await client.get(
        "/api/v1/documents/export?format=csv", headers=auth_headers
    )
    assert response.status_code == 200
    assert "text/csv" in response.headers.get("content-type", "")


@pytest.mark.asyncio
async def test_export_no_finalized_documents(
    client: AsyncClient,
    auth_headers: dict,
    test_user: User,
    db_session: AsyncSession,
):
    await _create_document(
        db_session, test_user.id,
        status=DocumentStatus.completed,
        is_finalized=False,
    )

    response = await client.get(
        "/api/v1/documents/export?format=json", headers=auth_headers
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_document_ownership(
    client: AsyncClient,
    auth_headers: dict,
    db_session: AsyncSession,
):
    """Documents should not be accessible by other users."""
    other_user_id = uuid.uuid4()
    from app.core.security import hash_password
    from app.models.user import User as UserModel

    other_user = UserModel(
        id=other_user_id,
        email="other@example.com",
        hashed_password=hash_password("password123"),
        full_name="Other User",
    )
    db_session.add(other_user)
    await db_session.commit()

    doc = await _create_document(db_session, other_user_id)

    response = await client.get(
        f"/api/v1/documents/{doc.id}", headers=auth_headers
    )
    assert response.status_code == 404
