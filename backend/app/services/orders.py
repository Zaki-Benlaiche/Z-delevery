"""منطق أعمال الطلبات: التسعير والانتقالات المسموح بها بين الحالات"""
from app.models.enums import OrderStatus as S
from app.models.enums import UserRole as R

# (الحالة الحالية، الحالة الجديدة) -> الأدوار المسموح لها بهذا الانتقال
TRANSITIONS: dict[tuple[S, S], set[R]] = {
    (S.PENDING, S.ACCEPTED): {R.MERCHANT, R.ADMIN},
    (S.PENDING, S.CANCELLED): {R.CUSTOMER, R.MERCHANT, R.ADMIN},
    (S.ACCEPTED, S.PREPARING): {R.MERCHANT, R.ADMIN},
    (S.ACCEPTED, S.CANCELLED): {R.MERCHANT, R.ADMIN},
    (S.PREPARING, S.READY): {R.MERCHANT, R.ADMIN},
    (S.READY, S.PICKED_UP): {R.DRIVER, R.ADMIN},
    (S.PICKED_UP, S.ON_THE_WAY): {R.DRIVER, R.ADMIN},
    (S.ON_THE_WAY, S.DELIVERED): {R.DRIVER, R.ADMIN},
}


def can_transition(current: S, new: S, role: R) -> bool:
    return role in TRANSITIONS.get((current, new), set())


def compute_pricing(
    subtotal: float,
    distance_km: float,
    *,
    base_fee: float,
    fee_per_km: float,
    commission_rate: float,
) -> tuple[float, float, float]:
    """يُعيد (delivery_fee, commission, total)."""
    delivery_fee = round(base_fee + fee_per_km * distance_km, 2)
    commission = round(subtotal * commission_rate, 2)
    total = round(subtotal + delivery_fee, 2)
    return delivery_fee, commission, total
