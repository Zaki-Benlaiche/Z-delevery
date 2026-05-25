"""أدوات جغرافية: تحويل الإحداثيات إلى/من نقاط PostGIS وحساب المسافة"""
from math import asin, cos, radians, sin, sqrt

from geoalchemy2.elements import WKTElement
from geoalchemy2.shape import to_shape

SRID = 4326  # نظام الإحداثيات WGS84 (خط الطول/العرض)


def make_point(lat: float, lng: float) -> WKTElement:
    """ينشئ نقطة جغرافية صالحة للتخزين في عمود Geography.

    ملاحظة: ترتيب WKT هو POINT(lng lat) — خط الطول أولاً.
    """
    return WKTElement(f"POINT({lng} {lat})", srid=SRID)


def read_point(value: object) -> tuple[float, float] | None:
    """يقرأ نقطة مخزّنة ويُعيد (lat, lng)، أو None إن لم تكن موجودة."""
    if value is None:
        return None
    shape = to_shape(value)  # type: ignore[arg-type]
    return shape.y, shape.x


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """المسافة التقريبية بين نقطتين بالكيلومترات (صيغة هافرسين)."""
    r = 6371.0  # نصف قطر الأرض بالكيلومتر
    d_lat = radians(lat2 - lat1)
    d_lng = radians(lng2 - lng1)
    a = sin(d_lat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lng / 2) ** 2
    return round(2 * r * asin(sqrt(a)), 2)
