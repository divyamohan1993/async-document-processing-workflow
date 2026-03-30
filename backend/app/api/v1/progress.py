import asyncio
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.redis import get_redis
from app.models.user import User
from app.services.document_service import DocumentService

router = APIRouter()


async def event_generator(
    document_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
    request: Request,
):
    """Generate SSE events from Redis Pub/Sub for a specific document."""
    # Verify document ownership
    service = DocumentService(db)
    await service.get_document(document_id=document_id, user_id=user_id)

    redis = await get_redis()
    pubsub = redis.pubsub()
    channel = f"document:{document_id}:progress"

    await pubsub.subscribe(channel)
    try:
        # Send initial connection event
        yield f"event: connected\ndata: {json.dumps({'message': 'Connected to progress stream', 'document_id': str(document_id)})}\n\n"

        while True:
            if await request.is_disconnected():
                break

            message = await pubsub.get_message(
                ignore_subscribe_messages=True, timeout=1.0
            )
            if message and message["type"] == "message":
                data = message["data"]
                if isinstance(data, bytes):
                    data = data.decode("utf-8")
                try:
                    event_data = json.loads(data)
                    event_type = event_data.get("event_type", "progress")
                    yield f"event: {event_type}\ndata: {data}\n\n"

                    # If job completed or failed, end the stream
                    if event_type in ("job_completed", "job_failed"):
                        break
                except json.JSONDecodeError:
                    yield f"event: message\ndata: {data}\n\n"
            else:
                # Send keepalive
                yield f": keepalive\n\n"
                await asyncio.sleep(0.5)
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.close()


@router.get("/{document_id}/progress")
async def document_progress(
    document_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    return StreamingResponse(
        event_generator(document_id, current_user.id, db, request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
