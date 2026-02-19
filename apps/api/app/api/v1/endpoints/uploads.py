import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.core.config import settings
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/uploads", tags=["uploads"])

# Magic bytes for allowed image types
_MAGIC_BYTES = {
    b"\xff\xd8\xff": ("image/jpeg", "jpg"),
    b"\x89PNG": ("image/png", "png"),
    b"RIFF": ("image/webp", "webp"),  # WebP starts with RIFF....WEBP
}


def _detect_image_type(data: bytes) -> tuple[str, str] | None:
    """Detect image type from magic bytes. Returns (mime, ext) or None."""
    for magic, result in _MAGIC_BYTES.items():
        if data[:len(magic)] == magic:
            # Extra check for WebP: bytes 8-12 must be "WEBP"
            if magic == b"RIFF" and data[8:12] != b"WEBP":
                continue
            return result
    return None


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    contents = await file.read()

    if len(contents) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Max 5MB.",
        )

    if len(contents) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too small to be a valid image.",
        )

    # Validate actual file content via magic bytes (not Content-Type header)
    detected = _detect_image_type(contents)
    if detected is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image file. Accepted formats: JPEG, PNG, WebP.",
        )

    _mime, ext = detected
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    return {"url": f"/uploads/{filename}"}
