from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.review import ReviewCreate


def test_review_requires_rating_range():
    with pytest.raises(ValidationError):
        ReviewCreate(order_id=uuid4(), product_id=uuid4(), rating=0, comment="Great product")


def test_review_requires_comment_length():
    with pytest.raises(ValidationError):
        ReviewCreate(order_id=uuid4(), product_id=uuid4(), rating=5, comment="ok")


def test_review_create_valid():
    body = ReviewCreate(order_id=uuid4(), product_id=uuid4(), rating=5, comment="Loved the quality")
    assert body.rating == 5
