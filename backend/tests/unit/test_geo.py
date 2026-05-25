"""اختبارات المساعدات الجغرافية"""
import pytest
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

from app.core.geo import haversine_km, make_point, read_point


def test_make_point_uses_lng_then_lat_in_wkt():
    """WKT يتطلّب POINT(lng lat) — هذا الخلط مصدر أخطاء شائع."""
    pt = make_point(36.7538, 3.0588)
    assert pt.data == "POINT(3.0588 36.7538)"
    assert pt.srid == 4326


def test_read_point_roundtrip():
    """قراءة نقطة مخزّنة (WKB) تُعيد (lat, lng) بالترتيب الصحيح."""
    wkb = from_shape(Point(3.0588, 36.7538), srid=4326)  # x=lng, y=lat
    result = read_point(wkb)
    assert result is not None
    lat, lng = result
    assert lat == pytest.approx(36.7538)
    assert lng == pytest.approx(3.0588)


def test_read_point_handles_none():
    """يجب أن يُعيد None للقيمة غير الموجودة (عمود nullable)."""
    assert read_point(None) is None


def test_haversine_zero_distance():
    """نقطتان متطابقتان تعطيان مسافة صفر."""
    assert haversine_km(36.75, 3.05, 36.75, 3.05) == 0.0


def test_haversine_known_distance():
    """مسافة معروفة بين حيدرة وحسين داي في الجزائر العاصمة ≈ 5 كم."""
    d = haversine_km(36.7600, 3.0500, 36.7320, 3.0860)
    assert 3.5 < d < 5.5


def test_haversine_symmetric():
    """المسافة يجب أن تكون متماثلة في الاتجاهين."""
    a = haversine_km(36.7, 3.0, 36.8, 3.1)
    b = haversine_km(36.8, 3.1, 36.7, 3.0)
    assert a == pytest.approx(b)
