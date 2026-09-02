import re
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

_INVALID_URL_PATTERNS = (
    re.compile(r"^file://", re.I),
    re.compile(r"^[a-zA-Z]:\\"),  # Windows absolute paths
    re.compile(r"^/[a-zA-Z]:\\"),  # /C:\...
    re.compile(r"^blob:", re.I),
)


def get_uploads_root() -> Path:
    """Return backend/uploads directory, creating it if needed."""
    root = Path(__file__).resolve().parent.parent.parent / "uploads"
    root.mkdir(parents=True, exist_ok=True)
    (root / "products").mkdir(parents=True, exist_ok=True)
    return root


def validate_public_image_url(url: str) -> str:
    """Reject local filesystem paths and other non-public URLs."""
    value = url.strip()
    if not value:
        raise ValueError("Image URL is required")

    for pattern in _INVALID_URL_PATTERNS:
        if pattern.search(value):
            raise ValueError("Local file paths are not allowed. Upload the image to the server.")

    if value.startswith("/"):
        if not value.startswith("/uploads/"):
            raise ValueError("Relative image URLs must start with /uploads/")
        return value

    if value.startswith(("http://", "https://")):
        return value

    raise ValueError("Image URL must be a valid http(s) URL or a /uploads/ path")


async def save_product_image(file: UploadFile) -> str:
    """Validate and persist an uploaded product image. Returns server-relative URL."""
    if not file.content_type or file.content_type not in ALLOWED_CONTENT_TYPES:
        allowed = ", ".join(sorted(ALLOWED_CONTENT_TYPES))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image type. Allowed: {allowed}",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")
    if len(data) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image exceeds maximum size of 5 MB",
        )

    ext = ALLOWED_CONTENT_TYPES[file.content_type]
    filename = f"{uuid.uuid4()}{ext}"
    dest = get_uploads_root() / "products" / filename
    dest.write_bytes(data)

    return f"/uploads/products/{filename}"
