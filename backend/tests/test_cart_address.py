"""Tests for address validation and cart schemas."""

import uuid

import pytest
from pydantic import ValidationError

from app.schemas.address import AddressCreate, validate_indian_phone, validate_indian_pincode
from app.schemas.cart import CartSyncRequest


def test_valid_indian_phone():
    assert validate_indian_phone("9876543210") == "9876543210"
    assert validate_indian_phone("+919876543210") == "9876543210"


def test_invalid_indian_phone():
    with pytest.raises(ValueError):
        validate_indian_phone("1234567890")
    with pytest.raises(ValueError):
        validate_indian_phone("987654321")


def test_valid_indian_pincode():
    assert validate_indian_pincode("400001") == "400001"


def test_invalid_indian_pincode():
    with pytest.raises(ValueError):
        validate_indian_pincode("040001")
    with pytest.raises(ValueError):
        validate_indian_pincode("40001")


def test_address_create_validation():
    addr = AddressCreate(
        full_name="Test User",
        phone="9876543210",
        line1="123 Street",
        city="Mumbai",
        state="Maharashtra",
        pincode="400001",
    )
    assert addr.full_name == "Test User"


def test_address_create_invalid_phone():
    with pytest.raises(ValidationError):
        AddressCreate(
            full_name="Test User",
            phone="1234567890",
            line1="123 Street",
            city="Mumbai",
            state="Maharashtra",
            pincode="400001",
        )


def test_cart_sync_request():
    product_id = uuid.uuid4()
    payload = CartSyncRequest(items=[{"product_id": product_id, "quantity": 2}])
    assert len(payload.items) == 1
    assert payload.items[0].quantity == 2
