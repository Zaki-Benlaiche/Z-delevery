"""نقاط نهاية الأدمن — توثيق السائقين وإدارة المنصّة"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.core.database import get_db
from app.models.driver import Driver
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.driver import DriverOut

router = APIRouter(prefix="/admin", tags=["الإدارة"])


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
