import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.address import AddressCreate, AddressResponse, AddressUpdate
from app.services import address_service

router = APIRouter()


@router.get("", response_model=list[AddressResponse])
async def list_addresses(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[AddressResponse]:
    addresses = await address_service.list_addresses(db, user.id)
    return [AddressResponse.model_validate(a) for a in addresses]


@router.post("", response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
async def create_address(
    body: AddressCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AddressResponse:
    address = await address_service.create_address(db, user.id, body)
    return AddressResponse.model_validate(address)


@router.get("/{address_id}", response_model=AddressResponse)
async def get_address(
    address_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AddressResponse:
    address = await address_service.get_address(db, user.id, address_id)
    return AddressResponse.model_validate(address)


@router.patch("/{address_id}", response_model=AddressResponse)
async def update_address(
    address_id: uuid.UUID,
    body: AddressUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AddressResponse:
    address = await address_service.update_address(db, user.id, address_id, body)
    return AddressResponse.model_validate(address)


@router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_address(
    address_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    await address_service.delete_address(db, user.id, address_id)
