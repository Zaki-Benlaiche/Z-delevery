"""نقاط نهاية السائقين — التسجيل، الحالة، الموقع اللحظي، واستلام الطلبات"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.core.geo import haversine_km, make_point, read_point
from app.models.driver import Driver
from app.models.enums import OrderStatus, UserRole
from app.models.merchant import Merchant
from app.models.order import Order, OrderTracking
from app.models.user import User
from app.schemas.common import LocationOut
from app.schemas.driver import (
    ContactOut,
    DriverEarnings,
    DriverLocationUpdate,
    DriverOrderDetail,
    DriverOut,
    DriverRegister,
    PickupOut,
)
from app.schemas.order import OrderItemOut, OrderOut
from app.services.realtime import manager

router = APIRouter(prefix="/drivers", tags=["السائقون"])

# الحالات التي يكون فيها للسائق طلب نشِط يستحقّ بثّ موقعه
_ACTIVE_STATUSES = {OrderStatus.PICKED_UP, OrderStatus.ON_THE_WAY}

# الطلبات المُسنَدة غير المنتهية = "جارية" في عدّاد السائق
_DRIVER_ACTIVE = (
    OrderStatus.ACCEPTED,
    OrderStatus.PREPARING,
    OrderStatus.READY,
    OrderStatus.PICKED_UP,
    OrderStatus.ON_THE_WAY,
)


def _driver_out(d: Driver) -> DriverOut:
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


def _order_out(o: Order) -> OrderOut:
    coords = read_point(o.delivery_location)
    return OrderOut(
        id=o.id,
        customer_id=o.customer_id,
        merchant_id=o.merchant_id,
        driver_id=o.driver_id,
        status=o.status,
        subtotal=float(o.subtotal),
        delivery_fee=float(o.delivery_fee),
        commission=float(o.commission),
        total=float(o.total),
        payment_method=o.payment_method,
        payment_status=o.payment_status,
        delivery_location=LocationOut(lat=coords[0], lng=coords[1]) if coords else None,
        delivery_details=o.delivery_details,
        items=[OrderItemOut.model_validate(i) for i in o.items],
        created_at=o.created_at,
    )


async def _my_driver(user: User, db: AsyncSession) -> Driver:
    driver = (
        await db.execute(select(Driver).where(Driver.user_id == user.id))
    ).scalar_one_or_none()
    if driver is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "لا يوجد ملف سائق — سجّل أولاً")
    return driver


@router.post("/register", response_model=DriverOut, status_code=status.HTTP_201_CREATED)
async def register_driver(
    payload: DriverRegister,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    existing = (
        await db.execute(select(Driver).where(Driver.user_id == user.id))
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "لديك ملف سائق بالفعل")
    driver = Driver(
        user_id=user.id,
        vehicle_type=payload.vehicle_type,
        license_url=payload.license_url,
        is_verified=False,  # ينتظر توثيق الإدارة من لوحة الأدمن قبل الاتّصال واستلام الطلبات
    )
    db.add(driver)
    # أي مستخدم ينضمّ للتوصيل يصبح سائقاً تلقائياً (ترقية الدور)
    if user.role == UserRole.CUSTOMER:
        user.role = UserRole.DRIVER
    await db.flush()
    await db.refresh(driver)
    return _driver_out(driver)


@router.get("/me", response_model=DriverOut)
async def my_driver_profile(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(UserRole.DRIVER, UserRole.ADMIN)),
):
    return _driver_out(await _my_driver(user, db))


@router.post("/online", response_model=DriverOut)
async def set_online(
    is_online: bool = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(UserRole.DRIVER, UserRole.ADMIN)),
):
    driver = await _my_driver(user, db)
    if is_online and not driver.is_verified:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "حسابك بانتظار توثيق الإدارة قبل بدء العمل"
        )
    driver.is_online = is_online
    await db.flush()
    await db.refresh(driver)
    return _driver_out(driver)


@router.post("/location", response_model=DriverOut)
async def update_location(
    payload: DriverLocationUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(UserRole.DRIVER, UserRole.ADMIN)),
):
    """تحديث موقع السائق وبثّه للزبائن المتتبّعين لطلباته النشِطة."""
    driver = await _my_driver(user, db)
    driver.current_location = make_point(payload.lat, payload.lng)
    await db.flush()

    active_orders = (
        await db.execute(
            select(Order.id).where(
                Order.driver_id == driver.id, Order.status.in_(_ACTIVE_STATUSES)
            )
        )
    ).scalars().all()
    for order_id in active_orders:
        await manager.broadcast(
            str(order_id),
            {
                "type": "driver_location",
                "order_id": str(order_id),
                "lat": payload.lat,
                "lng": payload.lng,
            },
        )

    await db.refresh(driver)
    return _driver_out(driver)


@router.get("/available-orders", response_model=list[OrderOut])
async def available_orders(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(UserRole.DRIVER, UserRole.ADMIN)),
    lat: float | None = Query(default=None, ge=-90, le=90),
    lng: float | None = Query(default=None, ge=-180, le=180),
):
    """الطلبات الجاهزة/قيد التحضير التي لم يُكلَّف بها سائق بعد، مرتّبة بالأقرب."""
    stmt = (
        select(Order)
        .where(
            Order.driver_id.is_(None),
            Order.status.in_([OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY]),
        )
        .options(selectinload(Order.items))
    )
    orders = (await db.execute(stmt)).scalars().all()

    if lat is None or lng is None:
        return [_order_out(o) for o in orders]

    # الفرز بالقرب من موقع المتجر (نقطة الاستلام)
    merchant_locs = {
        m_id: read_point(loc)
        for m_id, loc in (
            await db.execute(
                select(Merchant.id, Merchant.location).where(
                    Merchant.id.in_({o.merchant_id for o in orders})
                )
            )
        ).all()
    }

    def _dist(o: Order) -> float:
        c = merchant_locs.get(o.merchant_id)
        return haversine_km(lat, lng, c[0], c[1]) if c else float("inf")

    return [_order_out(o) for o in sorted(orders, key=_dist)]


@router.get("/earnings", response_model=DriverEarnings)
async def driver_earnings(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(UserRole.DRIVER, UserRole.ADMIN)),
):
    """ملخّص أرباح السائق: أرباحه = رسوم التوصيل (delivery_fee) للطلبات المُسلَّمة."""
    driver = await _my_driver(user, db)

    delivered = (Order.driver_id == driver.id, Order.status == OrderStatus.DELIVERED)
    agg = select(func.count(), func.coalesce(func.sum(Order.delivery_fee), 0))

    total_count, total_sum = (await db.execute(agg.where(*delivered))).one()

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_count, today_sum = (
        await db.execute(agg.where(*delivered, Order.created_at >= today_start))
    ).one()

    active_count = (
        await db.execute(
            select(func.count()).select_from(Order).where(
                Order.driver_id == driver.id, Order.status.in_(_DRIVER_ACTIVE)
            )
        )
    ).scalar_one()

    return DriverEarnings(
        deliveries=total_count,
        total_earnings=float(total_sum or 0),
        today_deliveries=today_count,
        today_earnings=float(today_sum or 0),
        active_orders=active_count,
        rating=float(driver.rating),
    )


@router.get("/orders/{order_id}", response_model=DriverOrderDetail)
async def driver_order_detail(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(UserRole.DRIVER, UserRole.ADMIN)),
):
    """تفاصيل طلب للسائق: نقطة الاستلام (المتجر) + هاتف التاجر والزبون للتنسيق.

    متاح إن كان الطلب مُسنَداً لي، أو غير مُسنَد وقابلاً للاستلام (ليقرّر السائق).
    """
    driver = None if user.role == UserRole.ADMIN else await _my_driver(user, db)
    stmt = select(Order).where(Order.id == order_id).options(selectinload(Order.items))
    order = (await db.execute(stmt)).scalar_one_or_none()
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "الطلب غير موجود")

    if user.role != UserRole.ADMIN:
        is_mine = driver is not None and order.driver_id == driver.id
        is_claimable = order.driver_id is None and order.status in (
            OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY,
        )
        if not (is_mine or is_claimable):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "لا تملك صلاحية عرض هذا الطلب")

    merchant = await db.get(Merchant, order.merchant_id)
    owner = await db.get(User, merchant.user_id) if merchant else None
    customer = await db.get(User, order.customer_id)

    pickup = None
    if merchant is not None:
        m_coords = read_point(merchant.location)
        pickup = PickupOut(
            merchant_id=merchant.id,
            name=merchant.name,
            phone=owner.phone if owner else None,
            location=LocationOut(lat=m_coords[0], lng=m_coords[1]) if m_coords else None,
        )

    base = _order_out(order)
    return DriverOrderDetail(
        **base.model_dump(),
        pickup=pickup,
        customer=ContactOut(name=customer.name, phone=customer.phone) if customer else None,
    )


@router.post("/orders/{order_id}/claim", response_model=OrderOut)
async def claim_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(UserRole.DRIVER, UserRole.ADMIN)),
):
    """يتكفّل السائق بطلب غير مُسنَد بعد."""
    driver = await _my_driver(user, db)
    if not driver.is_verified:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "حسابك بانتظار توثيق الإدارة قبل قبول طلبات"
        )
    stmt = select(Order).where(Order.id == order_id).options(selectinload(Order.items))
    order = (await db.execute(stmt)).scalar_one_or_none()
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "الطلب غير موجود")
    if order.driver_id is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "الطلب مُسنَد لسائق آخر")
    if order.status not in (OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY):
        raise HTTPException(status.HTTP_409_CONFLICT, "الطلب غير متاح للاستلام")

    order.driver_id = driver.id
    db.add(OrderTracking(order_id=order.id, status=order.status, location=driver.current_location))
    await manager.broadcast(
        str(order.id),
        {"type": "driver_assigned", "order_id": str(order.id), "driver_id": str(driver.id)},
    )
    await db.flush()
    return _order_out(order)
