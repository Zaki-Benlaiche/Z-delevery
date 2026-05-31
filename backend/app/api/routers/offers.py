"""نقاط نهاية العروض الترويجية — عرض عام للزبائن + إدارة من التاجر"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.core.database import get_db
from app.models.enums import UserRole
from app.models.merchant import Merchant
from app.models.offer import Offer
from app.models.user import User
from app.schemas.offer import OfferCreate, OfferOut, OfferUpdate

router = APIRouter(prefix="/offers", tags=["العروض"])


def _offer_out(o: Offer, *, merchant_name: str | None = None) -> OfferOut:
    return OfferOut(
        id=o.id,
        merchant_id=o.merchant_id,
        title=o.title,
        subtitle=o.subtitle,
        image_url=o.image_url,
        discount_pct=o.discount_pct,
        badge_text=o.badge_text,
        is_active=o.is_active,
        merchant_name=merchant_name,
    )


async def _my_merchant(user: User, db: AsyncSession) -> Merchant:
    merchant = (
        await db.execute(select(Merchant).where(Merchant.user_id == user.id))
    ).scalar_one_or_none()
    if merchant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "لا يوجد متجر مرتبط بحسابك")
    return merchant


# ---------- استعراض عام (للزبون) ----------
@router.get("", response_model=list[OfferOut])
async def list_offers(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=20, ge=1, le=50),
):
    """العروض المفعّلة لمتاجر مفتوحة — تظهر في كاروسيل رئيسية الزبون."""
    stmt = (
        select(Offer, Merchant.name)
        .join(Merchant, Merchant.id == Offer.merchant_id)
        .where(Offer.is_active.is_(True), Merchant.is_open.is_(True))
        .order_by(Offer.created_at.desc())
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()
    return [_offer_out(o, merchant_name=name) for o, name in rows]


# ---------- إدارة التاجر ----------
@router.get("/mine", response_model=list[OfferOut])
async def my_offers(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(UserRole.MERCHANT, UserRole.ADMIN)),
):
    merchant = await _my_merchant(user, db)
    rows = (
        await db.execute(
            select(Offer).where(Offer.merchant_id == merchant.id).order_by(Offer.created_at.desc())
        )
    ).scalars().all()
    return [_offer_out(o, merchant_name=merchant.name) for o in rows]


@router.post("", response_model=OfferOut, status_code=status.HTTP_201_CREATED)
async def create_offer(
    payload: OfferCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(UserRole.MERCHANT, UserRole.ADMIN)),
):
    merchant = await _my_merchant(user, db)
    offer = Offer(merchant_id=merchant.id, **payload.model_dump())
    db.add(offer)
    await db.flush()
    await db.refresh(offer)
    return _offer_out(offer, merchant_name=merchant.name)


async def _get_owned_offer(offer_id: uuid.UUID, user: User, db: AsyncSession) -> Offer:
    offer = await db.get(Offer, offer_id)
    if offer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "العرض غير موجود")
    if user.role != UserRole.ADMIN:
        merchant = await _my_merchant(user, db)
        if offer.merchant_id != merchant.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "لا تملك هذا العرض")
    return offer


@router.patch("/{offer_id}", response_model=OfferOut)
async def update_offer(
    offer_id: uuid.UUID,
    payload: OfferUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(UserRole.MERCHANT, UserRole.ADMIN)),
):
    offer = await _get_owned_offer(offer_id, user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(offer, field, value)
    await db.flush()
    await db.refresh(offer)
    return _offer_out(offer)


@router.delete("/{offer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_offer(
    offer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(UserRole.MERCHANT, UserRole.ADMIN)),
):
    offer = await _get_owned_offer(offer_id, user, db)
    await db.delete(offer)
