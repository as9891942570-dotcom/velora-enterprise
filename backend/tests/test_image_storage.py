"""Tests for image URL validation."""

import pytest

from app.utils.image_storage import validate_public_image_url


def test_rejects_file_url():
    with pytest.raises(ValueError, match="Local file paths"):
        validate_public_image_url("file:///C:/Users/test/image.jpg")


def test_rejects_windows_path():
    with pytest.raises(ValueError, match="Local file paths"):
        validate_public_image_url(r"C:\Users\test\image.jpg")


def test_accepts_uploads_path():
    assert validate_public_image_url("/uploads/products/abc.jpg") == "/uploads/products/abc.jpg"


def test_accepts_https_url():
    url = "https://example.com/image.jpg"
    assert validate_public_image_url(url) == url
