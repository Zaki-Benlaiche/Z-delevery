"""نقاط نهاية الأدمن — إحصاءات المنصّة، إدارة المتاجر، توثيق السائقين

تُقدّم بيانات تجميعية غنيّة للوحة القيادة الاحترافية: مؤشّرات أداء، توزيع
الحالات، سلاسل زمنية يومية، وصفحات تفصيل لكلّ متجر وسائق.
"""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_role
from app.core.database import get_db
from app.models.driver import Driver
from app.models.enums import OrderStatus, UserRole
from app.models.merchant import Merchant, Product
from app.models.order import Order, OrderItem
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["الإدارة"])

# حالات الطلب المكتمل ماليّاً (تُحتسب ضمن الإيراد)
_DELIVERED = OrderStatus.DELIVERED
# الحالات النشطة (طلب جارٍ، ليس مُسلَّماً ولا ملغى)
_ACTIVE_STATUSES = [
    OrderStatus.PENDING,
    OrderStatus.ACCEPTED,
    OrderStatus.PREPARING,
    OrderStatus.READY,
    OrderStatus.PICKED_UP,
    OrderStatus.ON_THE_WAY,
]


def _status_value(s) -> str:
    return s.value if hasattr(s, "value") else s


# ════════════════════════════════════════════════════════════════════
#  إحصاءات المنصّة + لوحة القيادة
# ════════════════════════════════════════════════════════════════════
@router.get("/stats")
async def platform_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    """نظرة شاملة على المنصّة: عدّادات، إيراد، عمولة، توزيع حالات، واتجاه يومي."""

    async def _count(model, *where) -> int:
        q = select(func.count()).select_from(model)
        for w in where:
            q = q.where(w)
        return (await db.execute(q)).scalar_one()

    # عدّادات أساسية
    merchants = await _count(Merchant)
    drivers = await _count(Driver)
    orders = await _count(Order)
    customers = await _count(User, User.role == UserRole.CUSTOMER)
    open_merchants = await _count(Merchant, Merchant.is_open.is_(True))
    online_drivers = await _count(Driver, Driver.is_online.is_(True))
    verified_drivers = await _count(Driver, Driver.is_verified.is_(True))

    # ماليّات الطلبات المُسلَّمة
    delivered_agg = (
        await db.execute(
            select(
                func.coalesce(func.sum(Order.total), 0),
                func.coalesce(func.sum(Order.commission), 0),
                func.count(),
            ).where(Order.status == _DELIVERED)
        )
    ).one()
    sales = float(delivered_agg[0] or 0)
    commission = float(delivered_agg[1] or 0)
    delivered_count = int(delivered_agg[2] or 0)
    avg_order = round(sales / delivered_count, 2) if delivered_count else 0.0

    pending = await _count(Order, Order.status == OrderStatus.PENDING)
    cancelled = await _count(Order, Order.status == OrderStatus.CANCELLED)
    active = await _count(Order, Order.status.in_(_ACTIVE_STATUSES))

    # توزيع الطلبات حسب الحالة
    status_rows = (
        await db.execute(select(Order.status, func.count()).group_by(Order.status))
    ).all()
    by_status = {_status_value(s): int(c) for s, c in status_rows}

    # طلبات/إيراد اليوم
    now = datetime.now(timezone.utc)
    start_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_agg = (
        await db.execute(
            select(func.count(), func.coalesce(func.sum(Order.total), 0)).where(
                Order.created_at >= start_today
            )
        )
    ).one()
    orders_today = int(today_agg[0] or 0)
    revenue_today = float(today_agg[1] or 0)

    # اتجاه يومي لآخر 14 يوماً (طلبات + إيراد مُسلَّم)
    days = 14
    start_window = (start_today - timedelta(days=days - 1))
    day_col = func.date_trunc("day", Order.created_at).label("d")
    trend_rows = (
        await db.execute(
            select(
                day_col,
                func.count(),
                func.coalesce(
                    func.sum(
                        case((Order.status == _DELIVERED, Order.total), else_=0)
                    ),
                    0,
                ),
            )
            .where(Order.created_at >= start_window)
            .group_by(day_col)
            .order_by(day_col)
        )
    ).all()
    trend_map = {
        r[0].date().isoformat(): {"orders": int(r[1]), "revenue": float(r[2] or 0)}
        for r in trend_rows
    }
    daily = []
    for i in range(days):
        d = (start_window + timedelta(days=i)).date().isoformat()
        point = trend_map.get(d, {"orders": 0, "revenue": 0.0})
        daily.append({"date": d, "orders": point["orders"], "revenue": point["revenue"]})

    return {
        # عدّادات
        "merchants": merchants,
        "open_merchants": open_merchants,
        "drivers": drivers,
        "online_drivers": online_drivers,
        "verified_drivers": verified_drivers,
        "customers": customers,
        "orders": orders,
        # ماليّات
        "sales": sales,
        "commission": commission,
        "avg_order": avg_order,
        "delivered_orders": delivered_count,
        # نشاط
        "pending_orders": pending,
        "active_orders": active,
        "cancelled_orders": cancelled,
        "orders_today": orders_today,
        "revenue_today": revenue_today,
        # توزيع + اتجاه
        "by_status": by_status,
        "daily": daily,
    }


# ════════════════════════════════════════════════════════════════════
#  المتاجر
# ════════════════════════════════════════════════════════════════════
@router.get("/merchants")
async def list_all_merchants(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    """قائمة المتاجر مع مؤشّرات: المالك، عدد الطلبات، الإيراد المُسلَّم، عدد المنتجات."""
    merchants = (
        await db.execute(select(Merchant).order_by(Merchant.created_at.desc()))
    ).scalars().all()
    if not merchants:
        return []

    ids = [m.id for m in merchants]

    # طلبات + إيراد مُسلَّم لكلّ متجر
    order_rows = (
        await db.execute(
            select(
                Order.merchant_id,
                func.count(),
                func.coalesce(
                    func.sum(
                        case((Order.status == _DELIVERED, Order.total), else_=0)
                    ),
                    0,
                ),
            )
            .where(Order.merchant_id.in_(ids))
            .group_by(Order.merchant_id)
        )
    ).all()
    order_map = {r[0]: (int(r[1]), float(r[2] or 0)) for r in order_rows}

    # عدد المنتجات
    product_rows = (
        await db.execute(
            select(Product.merchant_id, func.count())
            .where(Product.merchant_id.in_(ids))
            .group_by(Product.merchant_id)
        )
    ).all()
    product_map = {r[0]: int(r[1]) for r in product_rows}

    # أصحاب المتاجر
    user_ids = [m.user_id for m in merchants]
    owners = (
        await db.execute(select(User).where(User.id.in_(user_ids)))
    ).scalars().all()
    owner_map = {u.id: u for u in owners}

    result = []
    for m in merchants:
        orders_count, revenue = order_map.get(m.id, (0, 0.0))
        owner = owner_map.get(m.user_id)
        result.append(
            {
                "id": str(m.id),
                "name": m.name,
                "type": m.type,
                "is_open": m.is_open,
                "rating": float(m.rating),
                "logo_url": m.logo_url,
                "owner_name": owner.name if owner else None,
                "owner_phone": owner.phone if owner else None,
                "orders_count": orders_count,
                "revenue": revenue,
                "products_count": product_map.get(m.id, 0),
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
        )
    return result


@router.get("/merchants/{merchant_id}")
async def merchant_detail(
    merchant_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    """تفصيل متجر واحد: معلوماته، مالكه، مؤشّرات، توزيع حالات، آخر الطلبات، أعلى المنتجات."""
    m = await db.get(Merchant, merchant_id)
    if m is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "المتجر غير موجود")

    owner = await db.get(User, m.user_id)

    # مؤشّرات ماليّة
    agg = (
        await db.execute(
            select(
                func.count(),
                func.coalesce(
                    func.sum(
                        case((Order.status == _DELIVERED, Order.total), else_=0)
                    ),
                    0,
                ),
                func.coalesce(
                    func.sum(
                        case((Order.status == _DELIVERED, Order.commission), else_=0)
                    ),
                    0,
                ),
                func.coalesce(
                    func.sum(
                        case((Order.status == _DELIVERED, 1), else_=0)
                    ),
                    0,
                ),
            ).where(Order.merchant_id == merchant_id)
        )
    ).one()
    orders_count = int(agg[0] or 0)
    revenue = float(agg[1] or 0)
    commission = float(agg[2] or 0)
    delivered = int(agg[3] or 0)

    status_rows = (
        await db.execute(
            select(Order.status, func.count())
            .where(Order.merchant_id == merchant_id)
            .group_by(Order.status)
        )
    ).all()
    by_status = {_status_value(s): int(c) for s, c in status_rows}

    products_count = (
        await db.execute(
            select(func.count()).select_from(Product).where(Product.merchant_id == merchant_id)
        )
    ).scalar_one()

    recent = (
        await db.execute(
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.merchant_id == merchant_id)
            .order_by(Order.created_at.desc())
            .limit(8)
        )
    ).scalars().all()

    # أعلى المنتجات مبيعاً (من لقطات order_items عبر طلبات هذا المتجر)
    top_rows = (
        await db.execute(
            select(
                OrderItem.product_name,
                func.coalesce(func.sum(OrderItem.qty), 0).label("qty"),
            )
            .join(Order, Order.id == OrderItem.order_id)
            .where(Order.merchant_id == merchant_id)
            .group_by(OrderItem.product_name)
            .order_by(func.sum(OrderItem.qty).desc())
            .limit(5)
        )
    ).all()
    top_products = [{"name": r[0], "qty": int(r[1] or 0)} for r in top_rows]

    return {
        "id": str(m.id),
        "name": m.name,
        "type": m.type,
        "description": m.description,
        "logo_url": m.logo_url,
        "is_open": m.is_open,
        "rating": float(m.rating),
        "open_hours": m.open_hours,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "owner": {
            "name": owner.name if owner else None,
            "phone": owner.phone if owner else None,
        }
        if owner
        else None,
        "orders_count": orders_count,
        "delivered_orders": delivered,
        "revenue": revenue,
        "commission": commission,
        "avg_order": round(revenue / delivered, 2) if delivered else 0.0,
        "products_count": int(products_count),
        "by_status": by_status,
        "recent_orders": [
            {
                "id": str(o.id),
                "status": _status_value(o.status),
                "total": float(o.total),
                "items_count": sum(i.qty for i in o.items),
                "created_at": o.created_at.isoformat() if o.created_at else None,
            }
            for o in recent
        ],
        "top_products": top_products,
    }


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


# ════════════════════════════════════════════════════════════════════
#  الطلبات
# ════════════════════════════════════════════════════════════════════
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
            "status": _status_value(o.status),
            "total": float(o.total),
            "items_count": sum(i.qty for i in o.items),
            "created_at": o.created_at.isoformat() if o.created_at else None,
        }
        for o in rows
    ]


# ════════════════════════════════════════════════════════════════════
#  السائقون
# ════════════════════════════════════════════════════════════════════
def _driver_location(d: Driver):
    from app.core.geo import read_point

    coords = read_point(d.current_location)
    return {"lat": coords[0], "lng": coords[1]} if coords else None


@router.get("/drivers")
async def list_all_drivers(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    """قائمة السائقين مع مؤشّرات: المالك، التوصيلات المكتملة، الأرباح، الطلبات النشطة."""
    drivers = (
        await db.execute(select(Driver).order_by(Driver.created_at.desc()))
    ).scalars().all()
    if not drivers:
        return []

    ids = [d.id for d in drivers]

    # توصيلات مكتملة + أرباح (رسوم التوصيل) لكلّ سائق
    delivered_rows = (
        await db.execute(
            select(
                Order.driver_id,
                func.count(),
                func.coalesce(func.sum(Order.delivery_fee), 0),
            )
            .where(Order.driver_id.in_(ids), Order.status == _DELIVERED)
            .group_by(Order.driver_id)
        )
    ).all()
    delivered_map = {r[0]: (int(r[1]), float(r[2] or 0)) for r in delivered_rows}

    # طلبات نشطة لكلّ سائق
    active_rows = (
        await db.execute(
            select(Order.driver_id, func.count())
            .where(Order.driver_id.in_(ids), Order.status.in_(_ACTIVE_STATUSES))
            .group_by(Order.driver_id)
        )
    ).all()
    active_map = {r[0]: int(r[1]) for r in active_rows}

    user_ids = [d.user_id for d in drivers]
    owners = (
        await db.execute(select(User).where(User.id.in_(user_ids)))
    ).scalars().all()
    owner_map = {u.id: u for u in owners}

    result = []
    for d in drivers:
        deliveries, earnings = delivered_map.get(d.id, (0, 0.0))
        owner = owner_map.get(d.user_id)
        result.append(
            {
                "id": str(d.id),
                "user_id": str(d.user_id),
                "vehicle_type": d.vehicle_type,
                "license_url": d.license_url,
                "is_verified": d.is_verified,
                "is_online": d.is_online,
                "rating": float(d.rating),
                "current_location": _driver_location(d),
                "owner_name": owner.name if owner else None,
                "owner_phone": owner.phone if owner else None,
                "deliveries": deliveries,
                "earnings": earnings,
                "active_orders": active_map.get(d.id, 0),
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
        )
    return result


@router.get("/drivers/{driver_id}")
async def driver_detail(
    driver_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    """تفصيل سائق واحد: معلوماته، مالكه، مؤشّرات، توزيع حالات، آخر مهامه."""
    d = await db.get(Driver, driver_id)
    if d is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "السائق غير موجود")

    owner = await db.get(User, d.user_id)

    agg = (
        await db.execute(
            select(
                func.count(),
                func.coalesce(
                    func.sum(case((Order.status == _DELIVERED, 1), else_=0)), 0
                ),
                func.coalesce(
                    func.sum(
                        case((Order.status == _DELIVERED, Order.delivery_fee), else_=0)
                    ),
                    0,
                ),
            ).where(Order.driver_id == driver_id)
        )
    ).one()
    total_assigned = int(agg[0] or 0)
    deliveries = int(agg[1] or 0)
    earnings = float(agg[2] or 0)

    status_rows = (
        await db.execute(
            select(Order.status, func.count())
            .where(Order.driver_id == driver_id)
            .group_by(Order.status)
        )
    ).all()
    by_status = {_status_value(s): int(c) for s, c in status_rows}

    recent = (
        await db.execute(
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.driver_id == driver_id)
            .order_by(Order.created_at.desc())
            .limit(8)
        )
    ).scalars().all()

    return {
        "id": str(d.id),
        "vehicle_type": d.vehicle_type,
        "license_url": d.license_url,
        "is_verified": d.is_verified,
        "is_online": d.is_online,
        "rating": float(d.rating),
        "current_location": _driver_location(d),
        "created_at": d.created_at.isoformat() if d.created_at else None,
        "owner": {
            "name": owner.name if owner else None,
            "phone": owner.phone if owner else None,
        }
        if owner
        else None,
        "total_assigned": total_assigned,
        "deliveries": deliveries,
        "earnings": earnings,
        "active_orders": by_status.get("pending", 0)
        + by_status.get("accepted", 0)
        + by_status.get("preparing", 0)
        + by_status.get("ready", 0)
        + by_status.get("picked_up", 0)
        + by_status.get("on_the_way", 0),
        "by_status": by_status,
        "recent_orders": [
            {
                "id": str(o.id),
                "status": _status_value(o.status),
                "total": float(o.total),
                "delivery_fee": float(o.delivery_fee),
                "items_count": sum(i.qty for i in o.items),
                "created_at": o.created_at.isoformat() if o.created_at else None,
            }
            for o in recent
        ],
    }


@router.get("/drivers/pending")
async def list_pending_drivers(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    """قائمة السائقين بانتظار التوثيق."""
    rows = (
        await db.execute(select(Driver).where(Driver.is_verified.is_(False)))
    ).scalars().all()
    return [
        {
            "id": str(d.id),
            "user_id": str(d.user_id),
            "vehicle_type": d.vehicle_type,
            "license_url": d.license_url,
            "is_verified": d.is_verified,
            "is_online": d.is_online,
            "rating": float(d.rating),
            "current_location": _driver_location(d),
        }
        for d in rows
    ]


@router.post("/drivers/{driver_id}/verify")
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
    return {"id": str(driver.id), "is_verified": driver.is_verified}


@router.post("/drivers/{driver_id}/unverify")
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
    return {"id": str(driver.id), "is_verified": driver.is_verified}
