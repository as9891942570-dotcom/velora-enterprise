import re
import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import AddressType

PINCODE_PATTERN = re.compile(r"^[1-9][0-9]{5}$")
PHONE_PATTERN = re.compile(r"^[6-9][0-9]{9}$")


def validate_indian_phone(value: str) -> str:
    cleaned = value.strip().replace(" ", "").replace("-", "")
    if cleaned.startswith("+91"):
        cleaned = cleaned[3:]
    if cleaned.startswith("0"):
        cleaned = cleaned[1:]
    if not PHONE_PATTERN.match(cleaned):
        raise ValueError("Invalid Indian phone number (10 digits, starting 6-9)")
    return cleaned


def validate_indian_pincode(value: str) -> str:
    if not PINCODE_PATTERN.match(value):
        raise ValueError("Invalid Indian pincode (6 digits)")
    return value


class AddressBase(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=10, max_length=20)
    line1: str = Field(min_length=1, max_length=500)
    line2: str | None = None
    landmark: str | None = None
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    pincode: str = Field(min_length=6, max_length=6)
    country: str = Field(default="IN", min_length=2, max_length=2)
    address_type: AddressType = AddressType.HOME

    @field_validator("phone")
    @classmethod
    def check_phone(cls, value: str) -> str:
        return validate_indian_phone(value)

    @field_validator("pincode")
    @classmethod
    def check_pincode(cls, value: str) -> str:
        return validate_indian_pincode(value)


class AddressCreate(AddressBase):
    is_default: bool = False


class AddressUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, min_length=10, max_length=20)
    line1: str | None = Field(default=None, min_length=1, max_length=500)
    line2: str | None = None
    landmark: str | None = None
    city: str | None = Field(default=None, min_length=1, max_length=100)
    state: str | None = Field(default=None, min_length=1, max_length=100)
    pincode: str | None = Field(default=None, min_length=6, max_length=6)
    country: str | None = Field(default=None, min_length=2, max_length=2)
    address_type: AddressType | None = None
    is_default: bool | None = None

    @field_validator("phone")
    @classmethod
    def check_phone(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return validate_indian_phone(value)

    @field_validator("pincode")
    @classmethod
    def check_pincode(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return validate_indian_pincode(value)


class AddressResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    phone: str
    line1: str
    line2: str | None
    landmark: str | None
    city: str
    state: str
    pincode: str
    country: str
    address_type: AddressType
    is_default: bool
