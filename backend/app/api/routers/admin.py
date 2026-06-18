"""نقاط نهاية الأدمن — توثيق السائقين وإدارة المنصّة"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_role
from app.core.database import get_db
from app.models.driver import Driver
from app.models.enums import OrderStatus, UserRole
from app.models.merchant import Merchant
from app.models.order import Order
from app.models.user import User
from app.schemas.driver import DriverOut

router = APIRouter(prefix="/admin", tags=["الإدارة"])


@router.get("/stats")
async def platform_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    async def _count(model) -> int:
        return (await db.execute(select(func.count()).select_from(model))).scalar_one()

    sales = (
        await db.execute(
            select(func.coalesce(func.sum(Order.total), 0)).where(Order.status == OrderStatus.DELIVERED)
        )
    ).scalar_one()
    pending = (
        await db.execute(select(func.count()).select_from(Order).where(Order.status == OrderStatus.PENDING))
    ).scalar_one()
    return {
        "merchants": await _count(Merchant),
        "drivers": await _count(Driver),
        "orders": await _count(Order),
        "sales": float(sales or 0),
        "pending_orders": pending,
    }


@router.get("/merchants")
async def list_all_merchants(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    rows = (await db.execute(select(Merchant).order_by(Merchant.created_at.desc()))).scalars().all()
    return [
        {"id": str(m.id), "name": m.name, "type": m.type, "is_open": m.is_open, "rating": float(m.rating)}
        for m in rows
    ]


@router.post("/merchants/{merchant_id}/toggle")
async def toggle_merchant(
    merchant_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    m = await db.get(Merchant, merchant_id)
    if m is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "المتجر غير موجود")
    m.is_open = not m.is_open
    await db.flush()
    return {"id": str(m.id), "is_open": m.is_open}


@router.delete("/merchants/{merchant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_merchant(
    merchant_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    m = await db.get(Merchant, merchant_id)
    if m is None:
        return
    # الطلبات تشير للمتجر دون حذف تتالٍ — نمنع الحذف بدل تعطّل قيد FK
    order_count = (
        await db.execute(select(func.count()).select_from(Order).where(Order.merchant_id == merchant_id))
    ).scalar_one()
    if order_count:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"لا يمكن حذف متجر له طلبات ({order_count}). أغلقه بدلاً من الحذف.",
        )
    await db.delete(m)
    await db.flush()


@router.get("/orders")
async def list_all_orders(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    rows = (
        await db.execute(
            select(Order).options(selectinload(Order.items)).order_by(Order.created_at.desc()).limit(100)
        )
    ).scalars().all()
    return [
        {
            "id": str(o.id),
            "status": o.status.value if hasattr(o.status, "value") else o.status,
            "total": float(o.total),
            "items_count": sum(i.qty for i in o.items),
            "created_at": o.created_at.isoformat(),
        }
        for o in rows
    ]


@router.get("/drivers", response_model=list[DriverOut])
async def list_all_drivers(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    rows = (await db.execute(select(Driver))).scalars().all()
    return [_driver_out(d) for d in rows]


def _driver_out(d: Driver) -> DriverOut:
    # نُعيد استخدام نفس المخرج المعرّف في drivers router
    from app.core.geo import read_point
    from app.schemas.common import LocationOut

    coords = read_point(d.current_location)
    return DriverOut(
        id=d.id,
        user_id=d.user_id,
        vehicle_type=d.vehicle_type,
        license_url=d.license_url,
        is_verified=d.is_verified,
        is_online=d.is_online,
        rating=float(d.rating),
        current_location=LocationOut(lat=coords[0], lng=coords[1]) if coords else None,
    )


@router.get("/drivers/pending", response_model=list[DriverOut])
async def list_pending_drivers(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    """قائمة السائقين بانتظار التوثيق."""
    rows = (
        await db.execute(select(Driver).where(Driver.is_verified.is_(False)))
    ).scalars().all()
    return [_driver_out(d) for d in rows]


@router.post("/drivers/{driver_id}/verify", response_model=DriverOut)
async def verify_driver(
    driver_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    """يفعّل سائقاً ويسمح له بقبول الطلبات."""
    driver = await db.get(Driver, driver_id)
    if driver is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "السائق غير موجود")
    driver.is_verified = True
    await db.flush()
    await db.refresh(driver)
    return _driver_out(driver)


@router.post("/drivers/{driver_id}/unverify", response_model=DriverOut)
async def unverify_driver(
    driver_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    """يعطّل سائقاً (مثلاً عند انتهاء صلاحية الرخصة)."""
    driver = await db.get(Driver, driver_id)
    if driver is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "السائق غير موجود")
    driver.is_verified = False
    driver.is_online = False
    await db.flush()
    await db.refresh(driver)
    return _driver_out(driver)
