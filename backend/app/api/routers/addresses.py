"""نقاط نهاية عناوين المستخدم"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.geo import make_point, read_point
from app.models.user import Address, User
from app.schemas.address import AddressCreate, AddressOut
from app.schemas.common import LocationOut

router = APIRouter(prefix="/addresses", tags=["العناوين"])


def _address_out(a: Address) -> AddressOut:
    coords = read_point(a.location)
    return AddressOut(
        id=a.id,
        label=a.label,
        details=a.details,
        location=LocationOut(lat=coords[0], lng=coords[1]) if coords else None,
    )


@router.get("", response_model=list[AddressOut])
async def my_addresses(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = (
        await db.execute(select(Address).where(Address.user_id == user.id))
    ).scalars().all()
    return [_address_out(a) for a in rows]


@router.post("", response_model=AddressOut, status_code=status.HTTP_201_CREATED)
async def add_address(
    payload: AddressCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    address = Address(
        user_id=user.id,
        label=payload.label,
        details=payload.details,
        location=make_point(payload.lat, payload.lng),
    )
    db.add(address)
    await db.flush()
    await db.refresh(address)
    return _address_out(address)


@router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_address(
    address_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    address = await db.get(Address, address_id)
    if address is None or address.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "العنوان غير موجود")
    await db.delete(address)
