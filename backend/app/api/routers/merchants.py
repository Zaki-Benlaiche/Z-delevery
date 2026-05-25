"""نقاط نهاية التجّار والمنتجات"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.core.geo import haversine_km, make_point, read_point
from app.models.enums import MerchantType, UserRole
from app.models.merchant import Merchant, Product
from app.models.user import User
from app.schemas.common import LocationOut
from app.schemas.merchant import (
    MerchantCreate,
    MerchantDetail,
    MerchantOut,
    MerchantUpdate,
    ProductCreate,
    ProductOut,
    ProductUpdate,
)

router = APIRouter(prefix="/merchants", tags=["التجّار"])


def _location_out(value: object) -> LocationOut | None:
    coords = read_point(value)
    return LocationOut(lat=coords[0], lng=coords[1]) if coords else None


def _merchant_out(m: Merchant, *, distance_km: float | None = None) -> MerchantOut:
    return MerchantOut(
        id=m.id,
        name=m.name,
        type=m.type,
        description=m.description,
        logo_url=m.logo_url,
        open_hours=m.open_hours,
        is_open=m.is_open,
        rating=float(m.rating),
        location=_location_out(m.location),
        distance_km=distance_km,
    )


def _product_out(p: Product) -> ProductOut:
    return ProductOut.model_validate(p)


async def _get_owned_merchant(merchant_id: uuid.UUID, user: User, db: AsyncSession) -> Merchant:
    merchant = await db.get(Merchant, merchant_id)
    if merchant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "التاجر غير موجود")
    if merchant.user_id != user.id and user.role != UserRole.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "لا تملك هذا المتجر")
    return merchant


# ---------- استعراض عام ----------
@router.get("", response_model=list[MerchantOut])
async def list_merchants(
    db: AsyncSession = Depends(get_db),
    type: MerchantType | None = None,
    q: str | None = Query(default=None, description="بحث بالاسم"),
    lat: float | None = Query(default=None, ge=-90, le=90),
    lng: float | None = Query(default=None, ge=-180, le=180),
    open_only: bool = False,
):
    """قائمة التجّار، مع فرز اختياري حسب القرب إذا مُرّرت الإحداثيات."""
    stmt = select(Merchant)
    if type is not None:
        stmt = stmt.where(Merchant.type == type)
    if q:
        stmt = stmt.where(Merchant.name.ilike(f"%{q}%"))
    if open_only:
        stmt = stmt.where(Merchant.is_open.is_(True))

    merchants = (await db.execute(stmt)).scalars().all()

    out: list[MerchantOut] = []
    for m in merchants:
        distance = None
        if lat is not None and lng is not None:
            coords = read_point(m.location)
            if coords:
                distance = haversine_km(lat, lng, coords[0], coords[1])
        out.append(_merchant_out(m, distance_km=distance))

    if lat is not None and lng is not None:
        out.sort(key=lambda x: (x.distance_km is None, x.distance_km or 0))
    return out


@router.get("/me", response_model=MerchantDetail)
async def my_merchant(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """متجر المستخدم الحالي (للتاجر) — يُسهّل على الواجهات معرفة 'متجري'."""
    stmt = (
        select(Merchant)
        .where(Merchant.user_id == user.id)
        .options(selectinload(Merchant.products))
    )
    merchant = (await db.execute(stmt)).scalar_one_or_none()
    if merchant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "لا يوجد متجر مرتبط بحسابك")

    base = _merchant_out(merchant)
    return MerchantDetail(
        **base.model_dump(),
        products=[_product_out(p) for p in merchant.products],
    )


@router.get("/{merchant_id}", response_model=MerchantDetail)
async def get_merchant(merchant_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Merchant)
        .where(Merchant.id == merchant_id)
        .options(selectinload(Merchant.products))
    )
    merchant = (await db.execute(stmt)).scalar_one_or_none()
    if merchant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "التاجر غير موجود")

    base = _merchant_out(merchant)
    return MerchantDetail(
        **base.model_dump(),
        products=[_product_out(p) for p in merchant.products],
    )


# ---------- إدارة المتجر (للتاجر) ----------
@router.post("", response_model=MerchantOut, status_code=status.HTTP_201_CREATED)
async def create_merchant(
    payload: MerchantCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(UserRole.MERCHANT, UserRole.ADMIN)),
):
    existing = (
        await db.execute(select(Merchant).where(Merchant.user_id == user.id))
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "لديك متجر مسجّل بالفعل")

    merchant = Merchant(
        user_id=user.id,
        name=payload.name,
        type=payload.type,
        description=payload.description,
        logo_url=payload.logo_url,
        open_hours=payload.open_hours,
        location=make_point(payload.lat, payload.lng),
    )
    db.add(merchant)
    await db.flush()
    await db.refresh(merchant)
    return _merchant_out(merchant)


@router.patch("/{merchant_id}", response_model=MerchantOut)
async def update_merchant(
    merchant_id: uuid.UUID,
    payload: MerchantUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(UserRole.MERCHANT, UserRole.ADMIN)),
):
    merchant = await _get_owned_merchant(merchant_id, user, db)
    data = payload.model_dump(exclude_unset=True)
    lat, lng = data.pop("lat", None), data.pop("lng", None)
    for field, value in data.items():
        setattr(merchant, field, value)
    if lat is not None and lng is not None:
        merchant.location = make_point(lat, lng)
    await db.flush()
    await db.refresh(merchant)
    return _merchant_out(merchant)


# ---------- منتجات المتجر ----------
@router.post(
    "/{merchant_id}/products",
    response_model=ProductOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_product(
    merchant_id: uuid.UUID,
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(UserRole.MERCHANT, UserRole.ADMIN)),
):
    await _get_owned_merchant(merchant_id, user, db)
    product = Product(merchant_id=merchant_id, **payload.model_dump())
    db.add(product)
    await db.flush()
    await db.refresh(product)
    return _product_out(product)


@router.patch("/{merchant_id}/products/{product_id}", response_model=ProductOut)
async def update_product(
    merchant_id: uuid.UUID,
    product_id: uuid.UUID,
    payload: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(UserRole.MERCHANT, UserRole.ADMIN)),
):
    await _get_owned_merchant(merchant_id, user, db)
    product = await db.get(Product, product_id)
    if product is None or product.merchant_id != merchant_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "المنتج غير موجود")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    await db.flush()
    await db.refresh(product)
    return _product_out(product)


@router.delete("/{merchant_id}/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    merchant_id: uuid.UUID,
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(UserRole.MERCHANT, UserRole.ADMIN)),
):
    await _get_owned_merchant(merchant_id, user, db)
    product = await db.get(Product, product_id)
    if product is None or product.merchant_id != merchant_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "المنتج غير موجود")
    await db.delete(product)
