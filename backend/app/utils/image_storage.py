import re

import cloudinary
import cloudinary.uploader
from fastapi import HTTPException, UploadFile, status

from app.core.config import settings


ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}

MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


_INVALID_URL_PATTERNS = (
    re.compile(r"^file://", re.I),
    re.compile(r"^[a-zA-Z]:\\"),
    re.compile(r"^/[a-zA-Z]:\\"),
    re.compile(r"^blob:", re.I),
)


def validate_public_image_url(url: str) -> str:
    """Reject local filesystem paths and other non-public URLs."""

    value = url.strip()

    if not value:
        raise ValueError("Image URL is required")

    for pattern in _INVALID_URL_PATTERNS:
        if pattern.search(value):
            raise ValueError(
                "Local file paths are not allowed. Please upload the image."
            )

    if value.startswith(("http://", "https://")):
        return value

    raise ValueError("Image URL must be a valid public http(s) URL")


def configure_cloudinary() -> None:
    """Configure Cloudinary using environment variables."""

    if not settings.cloudinary_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cloudinary is not configured",
        )

    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )


async def save_product_image(file: UploadFile) -> dict:
    """Validate and upload a product image to Cloudinary."""

    if not file.content_type or file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image type. Allowed: JPEG, PNG, WebP, GIF",
        )

    data = await file.read()

    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file",
        )

    if len(data) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image exceeds maximum size of 5 MB",
        )

    configure_cloudinary()

    try:
        result = cloudinary.uploader.upload(
            data,
            folder="velora/products",
            resource_type="image",
        )

        return {
            "url": result["secure_url"],
            "cloudinary_public_id": result["public_id"],
        }

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cloudinary upload failed: {str(exc)}",
        )