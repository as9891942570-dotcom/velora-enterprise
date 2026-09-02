import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import ContactMessageStatus


class ContactRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    subject: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=1, max_length=5000)


class ContactMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    subject: str
    message: str
    status: ContactMessageStatus
    created_at: datetime


class ContactMessageStatusUpdate(BaseModel):
    status: ContactMessageStatus
