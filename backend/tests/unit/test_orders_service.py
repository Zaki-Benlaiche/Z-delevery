"""اختبارات منطق الطلبات: انتقالات الحالة وحساب التسعير"""
import pytest

from app.models.enums import OrderStatus as S
from app.models.enums import UserRole as R
from app.services.orders import can_transition, compute_pricing


# ---------- جدول الانتقالات ----------
@pytest.mark.parametrize(
    "current,new,role,expected",
    [
        # مسارات شرعية
        (S.PENDING, S.ACCEPTED, R.MERCHANT, True),
        (S.PENDING, S.CANCELLED, R.CUSTOMER, True),
        (S.ACCEPTED, S.PREPARING, R.MERCHANT, True),
        (S.PREPARING, S.READY, R.MERCHANT, True),
        (S.READY, S.PICKED_UP, R.DRIVER, True),
        (S.PICKED_UP, S.ON_THE_WAY, R.DRIVER, True),
        (S.ON_THE_WAY, S.DELIVERED, R.DRIVER, True),
        # المدير يستطيع فعل كل شيء
        (S.PENDING, S.ACCEPTED, R.ADMIN, True),
        (S.READY, S.PICKED_UP, R.ADMIN, True),
        # محظورة: السائق لا يقبل الطلبات
        (S.PENDING, S.ACCEPTED, R.DRIVER, False),
        # محظورة: التاجر لا يُسلِّم بنفسه
        (S.ON_THE_WAY, S.DELIVERED, R.MERCHANT, False),
        # محظورة: الزبون لا يلغي بعد القبول
        (S.ACCEPTED, S.CANCELLED, R.CUSTOMER, False),
        # محظورة: لا قفز عبر الحالات
        (S.PENDING, S.READY, R.MERCHANT, False),
        (S.PENDING, S.DELIVERED, R.ADMIN, False),
    ],
)
def test_transitions(current, new, role, expected):
    assert can_transition(current, new, role) is expected


# ---------- التسعير ----------
def test_pricing_basic():
    """طلب بـ 1000 دج، 3 كم: 200 رسوم + 30*3 = 290؛ عمولة 10٪ = 100؛ إجمالي 1290."""
    fee, commission, total = compute_pricing(
        1000, 3.0, base_fee=200, fee_per_km=30, commission_rate=0.10
    )
    assert fee == 290.0
    assert commission == 100.0
    assert total == 1290.0


def test_pricing_zero_distance():
    """مسافة صفر تعطي فقط الرسوم الأساسية."""
    fee, _, total = compute_pricing(
        500, 0, base_fee=200, fee_per_km=30, commission_rate=0.10
    )
    assert fee == 200.0
    assert total == 700.0


def test_pricing_rounding():
    """التقريب يجب أن يكون لرقمين عشريين."""
    fee, commission, total = compute_pricing(
        333.33, 1.5, base_fee=200, fee_per_km=30, commission_rate=0.07
    )
    assert fee == 245.0
    assert commission == round(333.33 * 0.07, 2)
    assert total == round(333.33 + 245.0, 2)


def test_pricing_commission_independent_of_distance():
    """العمولة دالّة في قيمة الطلب فقط، لا في المسافة."""
    _, c1, _ = compute_pricing(1000, 1, base_fee=200, fee_per_km=30, commission_rate=0.10)
    _, c2, _ = compute_pricing(1000, 100, base_fee=200, fee_per_km=30, commission_rate=0.10)
    assert c1 == c2
