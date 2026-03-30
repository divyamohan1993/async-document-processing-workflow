from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.documents import router as documents_router
from app.api.v1.progress import router as progress_router

v1_router = APIRouter()

v1_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
v1_router.include_router(documents_router, prefix="/documents", tags=["Documents"])
v1_router.include_router(progress_router, prefix="/documents", tags=["Progress"])
