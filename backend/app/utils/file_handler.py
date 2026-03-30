import os
import re
import uuid

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

ALLOWED_EXTENSIONS = {
    ".txt", ".pdf", ".docx", ".csv", ".xlsx", ".json", ".xml", ".md", ".rtf"
}

EXTENSION_TO_MIME = {
    ".txt": "text/plain",
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".csv": "text/csv",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".json": "application/json",
    ".xml": "application/xml",
    ".md": "text/markdown",
    ".rtf": "application/rtf",
}


def sanitize_filename(filename: str) -> str:
    """Remove path traversal and special characters from filename."""
    # Remove directory separators and path traversal
    filename = os.path.basename(filename)
    filename = filename.replace("..", "")
    # Keep only safe characters
    name, ext = os.path.splitext(filename)
    name = re.sub(r"[^\w\s\-.]", "", name).strip()
    if not name:
        name = "unnamed"
    return name + ext.lower()


class FileHandler:
    def __init__(self):
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    async def save_upload(self, file: UploadFile) -> dict:
        """Validate and save an uploaded file. Returns file info dict."""
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File has no filename",
            )

        # Sanitize
        safe_name = sanitize_filename(file.filename)
        _, ext = os.path.splitext(safe_name)

        if ext.lower() not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type '{ext}' is not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
            )

        # Read content to check size
        content = await file.read()
        file_size = len(content)

        if file_size > settings.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum size of {settings.MAX_FILE_SIZE // (1024 * 1024)}MB",
            )

        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty files are not allowed",
            )

        # Generate UUID-based storage name
        storage_name = f"{uuid.uuid4()}{ext.lower()}"
        file_path = os.path.join(settings.UPLOAD_DIR, storage_name)

        # Write to disk
        with open(file_path, "wb") as f:
            f.write(content)

        return {
            "filename": storage_name,
            "original_filename": safe_name,
            "file_type": ext.lower().lstrip("."),
            "file_size": file_size,
            "file_path": file_path,
        }
