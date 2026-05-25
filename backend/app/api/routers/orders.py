"""نقاط نهاية الطلبات — دورة حياة الطلب بين الزبون والتاجر والسائق"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.geo import haversine_km, make_point, read_point
from app.models.driver import Driver
from app.models.enums import OrderStatus, PaymentMethod, PaymentStatus, UserRole
from app.models.merchant import Merchant, Product
from app.models.order import Order, OrderItem, OrderTracking
from app.models.rating import Rating
from app.models.user import Address, User
from app.schemas.common import LocationOut
from app.schemas.order import OrderCreate, OrderItemOut, OrderOut, OrderStatusUpdate, TrackingOut
from app.schemas.rating import RatingCreate, RatingOut
from app.services.notifications import fire_and_forget, send_push
from app.services.orders import can_transition, compute_pricing
from app.services.realtime import manager

router = APIRouter(prefix="/orders", tags=["الطلبات"])


# ---------- تحويلات ----------
def _loc(value: object) -> LocationOut | None:
    coords = read_point(value)
    return LocationOut(lat=coords[0], lng=coords[1]) if coords else None


def _order_out(o: Order) -> OrderOut:
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
        delivery_location=_loc(o.delivery_location),
        delivery_details=o.delivery_details,
        items=[OrderItemOut.model_validate(i) for i in o.items],
        created_at=o.created_at,
    )


async def _load_order(order_id: uuid.UUID, db: AsyncSession) -> Order:
    stmt = (
        select(Order).where(Order.id == order_id).options(selectinload(Order.items))
    )
    order = (await db.execute(stmt)).scalar_one_or_none()
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "الطلب غير موجود")
    return order


async def _user_merchant_id(user: User, db: AsyncSession) -> uuid.UUID | None:
    if user.role != UserRole.MERCHANT:
        return None
    m = (
        await db.execute(select(Merchant.id).where(Merchant.user_id == user.id))
    ).scalar_one_or_none()
    return m


async def _user_driver(user: User, db: AsyncSession) -> Driver | None:
    if user.role != UserRole.DRIVER:
        return None
    return (
        await db.execute(select(Driver).where(Driver.user_id == user.id))
    ).scalar_one_or_none()


async def _assert_can_view(order: Order, user: User, db: AsyncSession) -> None:
    if user.role == UserRole.ADMIN or order.customer_id == user.id:
        return
    if user.role == UserRole.MERCHANT and order.merchant_id == await _user_merchant_id(user, db):
        return
    if user.role == UserRole.DRIVER:
        driver = await _user_driver(user, db)
        if driver and order.driver_id == driver.id:
            return
    raise HTTPException(status.HTTP_403_FORBIDDEN, "لا تملك صلاحية عرض هذا الطلب")


async def _record_tracking(
    order: Order, db: AsyncSession, *, location: object | None = None
) -> None:
    """يسجّل حالة الطلب الحالية في سجلّ التتبّع ويبثّها للمشتركين."""
    db.add(OrderTracking(order_id=order.id, status=order.status, location=location))
    await manager.broadcast(
        str(order.id),
        {
            "type": "status",
            "order_id": str(order.id),
            "status": order.status.value,
            "location": (lambda c: {"lat": c[0], "lng": c[1]} if c else None)(read_point(location)),
        },
    )


# رسائل الـ push المرتبطة بكل حالة (لـ الزبون)
_STATUS_MSG: dict[OrderStatus, tuple[str, str]] = {
    OrderStatus.ACCEPTED: ("تم قبول طلبك", "بدأ التاجر بتجهيز طلبك"),
    OrderStatus.PREPARING: ("طلبك قيد التحضير", "نحضّر طلبك الآن"),
    OrderStatus.READY: ("طلبك جاهز", "بانتظار وصول السائق"),
    OrderStatus.PICKED_UP: ("سائقك استلم طلبك", "في طريقه إليك"),
    OrderStatus.ON_THE_WAY: ("سائقك قريب", "تابع موقعه على الخريطة"),
    OrderStatus.DELIVERED: ("وصل طلبك ✓", "نتمنّى لك تجربة سعيدة"),
    OrderStatus.CANCELLED: ("أُلغي طلبك", "تواصل معنا إن احتجت توضيحاً"),
}


async def _push_status_to_customer(order: Order, db: AsyncSession) -> None:
    """يُرسل push للزبون عند تغيّر حالة طلبه (إن كان مسجّلاً للإشعارات)."""
    msg = _STATUS_MSG.get(order.status)
    if msg is None:
        return
    customer = await db.get(User, order.customer_id)
    if customer and customer.expo_push_token:
        title, body = msg
        fire_and_forget(
            send_push(
                customer.expo_push_token,
                title,
                body,
                data={"order_id": str(order.id), "screen": "OrderTracking"},
            )
        )


async def _push_new_order_to_merchant(order: Order, db: AsyncSession) -> None:
    """يُخطر التاجر بوصول طلب جديد."""
    stmt = select(User).join(Merchant, Merchant.user_id == User.id).where(Merchant.id == order.merchant_id)
    owner = (await db.execute(stmt)).scalar_one_or_none()
    if owner and owner.expo_push_token:
        fire_and_forget(
            send_push(
                owner.expo_push_token,
                "طلب جديد",
                f"وصلك طلب بقيمة {float(order.total):.0f} دج",
                data={"order_id": str(order.id), "screen": "OrderDetail"},
            )
        )


# ---------- الزبون: إنشاء الطلب ----------
@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    merchant = await db.get(Merchant, payload.merchant_id)
    if merchant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "التاجر غير موجود")
    if not merchant.is_open:
        raise HTTPException(status.HTTP_409_CONFLICT, "المتجر مغلق حالياً")

    # تحديد وجهة التسليم
    if payload.address_id is not None:
        address = await db.get(Address, payload.address_id)
        if address is None or address.user_id != user.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "العنوان غير موجود")
        dest = read_point(address.location)
        delivery_point = address.location
        delivery_details = payload.delivery_details or address.details
    else:
        dest = (payload.lat, payload.lng)
        delivery_point = make_point(payload.lat, payload.lng)
        delivery_details = payload.delivery_details

    # جلب المنتجات والتحقّق من أنها تتبع نفس التاجر ومتاحة
    product_ids = [i.product_id for i in payload.items]
    products = {
        p.id: p
        for p in (
            await db.execute(select(Product).where(Product.id.in_(product_ids)))
        ).scalars().all()
    }

    subtotal = 0.0
    order_items: list[OrderItem] = []
    for item in payload.items:
        product = products.get(item.product_id)
        if product is None or product.merchant_id != merchant.id:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, f"منتج غير صالح: {item.product_id}"
            )
        if not product.available:
            raise HTTPException(
                status.HTTP_409_CONFLICT, f"المنتج غير متاح: {product.name}"
            )
        unit_price = float(product.price)
        subtotal += unit_price * item.qty
        order_items.append(
            OrderItem(
                product_id=product.id,
                product_name=product.name,
                qty=item.qty,
                unit_price=unit_price,
                options=item.options,
            )
        )

    # المسافة من المتجر إلى وجهة التسليم لحساب رسوم التوصيل
    m_coords = read_point(merchant.location)
    distance = haversine_km(m_coords[0], m_coords[1], dest[0], dest[1]) if (m_coords and dest) else 0.0
    delivery_fee, commission, total = compute_pricing(
        subtotal,
        distance,
        base_fee=settings.delivery_base_fee,
        fee_per_km=settings.delivery_fee_per_km,
        commission_rate=settings.commission_rate,
    )

    order = Order(
        customer_id=user.id,
        merchant_id=merchant.id,
        status=OrderStatus.PENDING,
        subtotal=round(subtotal, 2),
        delivery_fee=delivery_fee,
        commission=commission,
        total=total,
        payment_method=payload.payment_method,
        payment_status=PaymentStatus.PENDING,
        delivery_location=delivery_point,
        delivery_details=delivery_details,
        items=order_items,
    )
    db.add(order)
    await db.flush()
    db.add(OrderTracking(order_id=order.id, status=OrderStatus.PENDING))
    await db.refresh(order, attribute_names=["items"])
    await _push_new_order_to_merchant(order, db)
    return _order_out(order)


# ---------- استعراض الطلبات (حسب الدور) ----------
@router.get("", response_model=list[OrderOut])
async def list_orders(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    status_filter: OrderStatus | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    stmt = (
        select(Order)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
        .limit(limit)
        .offset(offset)
    )

    if user.role == UserRole.CUSTOMER:
        stmt = stmt.where(Order.customer_id == user.id)
    elif user.role == UserRole.MERCHANT:
        merchant_id = await _user_merchant_id(user, db)
        if merchant_id is None:
            return []
        stmt = stmt.where(Order.merchant_id == merchant_id)
    elif user.role == UserRole.DRIVER:
        driver = await _user_driver(user, db)
        if driver is None:
            return []
        stmt = stmt.where(Order.driver_id == driver.id)
    # ADMIN: كل الطلبات

    if status_filter is not None:
        stmt = stmt.where(Order.status == status_filter)

    rows = (await db.execute(stmt)).scalars().all()
    return [_order_out(o) for o in rows]


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    order = await _load_order(order_id, db)
    await _assert_can_view(order, user, db)
    return _order_out(order)


@router.get("/{order_id}/tracking", response_model=list[TrackingOut])
async def order_tracking(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    order = await _load_order(order_id, db)
    await _assert_can_view(order, user, db)
    rows = (
        await db.execute(
            select(OrderTracking)
            .where(OrderTracking.order_id == order_id)
            .order_by(OrderTracking.timestamp.asc())
        )
    ).scalars().all()
    return [
        TrackingOut(status=t.status, location=_loc(t.location), timestamp=t.timestamp)
        for t in rows
    ]


# ---------- تغيير حالة الطلب ----------
@router.post("/{order_id}/status", response_model=OrderOut)
async def update_status(
    order_id: uuid.UUID,
    payload: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    order = await _load_order(order_id, db)
    new_status = payload.status

    if not can_transition(order.status, new_status, user.role):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"انتقال غير مسموح: {order.status.value} → {new_status.value}",
        )

    # تحقّق من ملكية الجهة الفاعلة
    if user.role == UserRole.MERCHANT:
        if order.merchant_id != await _user_merchant_id(user, db):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "ليس طلب متجرك")
    elif user.role == UserRole.CUSTOMER:
        if order.customer_id != user.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "ليس طلبك")
    elif user.role == UserRole.DRIVER:
        driver = await _user_driver(user, db)
        if driver is None or order.driver_id != driver.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "لست السائق المكلّف بهذا الطلب")

    order.status = new_status
    if new_status == OrderStatus.DELIVERED and order.payment_method == PaymentMethod.CASH:
        order.payment_status = PaymentStatus.PAID

    await _record_tracking(order, db)
    await _push_status_to_customer(order, db)
    await db.flush()
    return _order_out(order)


@router.post("/{order_id}/cancel", response_model=OrderOut)
async def cancel_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """اختصار لإلغاء الطلب من الزبون قبل خروجه للتوصيل."""
    order = await _load_order(order_id, db)
    if order.customer_id != user.id and user.role != UserRole.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "ليس طلبك")
    if not can_transition(order.status, OrderStatus.CANCELLED, user.role):
        raise HTTPException(
            status.HTTP_409_CONFLICT, "لا يمكن إلغاء الطلب في حالته الحالية"
        )
    order.status = OrderStatus.CANCELLED
    await _record_tracking(order, db)
    await _push_status_to_customer(order, db)
    await db.flush()
    return _order_out(order)


# ---------- تقييم الطلب ----------
@router.post("/{order_id}/rate", response_model=RatingOut, status_code=status.HTTP_201_CREATED)
async def rate_order(
    order_id: uuid.UUID,
    payload: RatingCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """يقيّم الزبون تجربته بعد تسليم الطلب — يحدّث متوسّط تقييم التاجر."""
    order = await db.get(Order, order_id)
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "الطلب غير موجود")
    if order.customer_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "لا يمكن تقييم طلب لست صاحبه")
    if order.status != OrderStatus.DELIVERED:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "لا يمكن التقييم قبل تسليم الطلب"
        )

    # تفادي التقييم المكرّر (مع UniqueConstraint كحاجز ثانٍ على مستوى DB)
    existing = (
        await db.execute(select(Rating).where(Rating.order_id == order_id))
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "سبق وقيّمت هذا الطلب")

    rating = Rating(
        order_id=order.id,
        customer_id=user.id,
        merchant_id=order.merchant_id,
        stars=payload.stars,
        comment=payload.comment,
    )
    db.add(rating)
    await db.flush()

    # نُحدّث متوسّط تقييم التاجر فوراً (سريع: SQL AVG على عمود مُفهرس)
    from sqlalchemy import func

    avg = (
        await db.execute(
            select(func.avg(Rating.stars)).where(Rating.merchant_id == order.merchant_id)
        )
    ).scalar()
    merchant = await db.get(Merchant, order.merchant_id)
    if merchant and avg is not None:
        merchant.rating = round(float(avg), 1)
        await db.flush()

    return RatingOut(
        id=rating.id,
        order_id=rating.order_id,
        merchant_id=rating.merchant_id,
        stars=rating.stars,
        comment=rating.comment,
        created_at=rating.created_at,
    )


@router.get("/{order_id}/rating", response_model=RatingOut | None)
async def get_order_rating(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """يُعيد تقييم الطلب إن وُجد — يستخدمه الموبايل ليُخفي زرّ التقييم بعد إرساله."""
    order = await db.get(Order, order_id)
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "الطلب غير موجود")
    await _assert_can_view(order, user, db)

    rating = (
        await db.execute(select(Rating).where(Rating.order_id == order_id))
    ).scalar_one_or_none()
    if rating is None:
        return None
    return RatingOut(
        id=rating.id,
        order_id=rating.order_id,
        merchant_id=rating.merchant_id,
        stars=rating.stars,
        comment=rating.comment,
        created_at=rating.created_at,
    )
