import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.address import Address
from app.schemas.address import AddressCreate, AddressUpdate


async def list_addresses(db: AsyncSession, user_id: uuid.UUID) -> list[Address]:
    result = await db.execute(
        select(Address).where(Address.user_id == user_id).order_by(Address.is_default.desc(), Address.created_at.desc())
    )
    return list(result.scalars().all())


async def get_address(db: AsyncSession, user_id: uuid.UUID, address_id: uuid.UUID) -> Address:
    result = await db.execute(
        select(Address).where(Address.id == address_id, Address.user_id == user_id)
    )
    address = result.scalar_one_or_none()
    if not address:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")
    return address


async def _clear_default(db: AsyncSession, user_id: uuid.UUID) -> None:
    result = await db.execute(select(Address).where(Address.user_id == user_id, Address.is_default.is_(True)))
    for addr in result.scalars().all():
        addr.is_default = False


async def create_address(db: AsyncSession, user_id: uuid.UUID, data: AddressCreate) -> Address:
    if data.is_default:
        await _clear_default(db, user_id)

    is_first = not await list_addresses(db, user_id)
    address = Address(
        user_id=user_id,
        full_name=data.full_name,
        phone=data.phone,
        line1=data.line1,
        line2=data.line2,
        landmark=data.landmark,
        city=data.city,
        state=data.state,
        pincode=data.pincode,
        country=data.country,
        address_type=data.address_type.value,
        is_default=data.is_default or is_first,
    )
    db.add(address)
    await db.flush()
    return address


async def update_address(
    db: AsyncSession, user_id: uuid.UUID, address_id: uuid.UUID, data: AddressUpdate
) -> Address:
    address = await get_address(db, user_id, address_id)
    updates = data.model_dump(exclude_unset=True)

    if updates.get("is_default"):
        await _clear_default(db, user_id)

    for key, value in updates.items():
        setattr(address, key, value)

    await db.flush()
    return address


async def delete_address(db: AsyncSession, user_id: uuid.UUID, address_id: uuid.UUID) -> None:
    address = await get_address(db, user_id, address_id)
    was_default = address.is_default
    await db.delete(address)
    await db.flush()

    if was_default:
        remaining = await list_addresses(db, user_id)
        if remaining:
            remaining[0].is_default = True
            await db.flush()


def address_to_shipping_dict(address: Address) -> dict:
    return {
        "full_name": address.full_name,
        "phone": address.phone,
        "line1": address.line1,
        "line2": address.line2,
        "landmark": address.landmark,
        "city": address.city,
        "state": address.state,
        "pincode": address.pincode,
        "country": address.country,
        "address_type": address.address_type,
    }
