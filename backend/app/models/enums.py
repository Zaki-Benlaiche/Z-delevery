"""التعدادات (Enums) المستخدمة عبر النماذج"""
import enum


class UserRole(str, enum.Enum):
    CUSTOMER = "customer"   # الزبون
    MERCHANT = "merchant"   # التاجر
    DRIVER = "driver"       # السائق
    ADMIN = "admin"         # المدير


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    PENDING = "pending"     # بانتظار التوثيق (للسائقين/التجار)
    BLOCKED = "blocked"


class MerchantType(str, enum.Enum):
    FOOD = "food"       # مطاعم
    FRESH = "fresh"     # لحوم/دجاج/سمك/خضر/فواكه
    MARKET = "market"   # مواد غذائية وبقالة
    CLINIC = "clinic"   # أطباء/عيادات (حجز موعد بنظام طابور)


class AppointmentStatus(str, enum.Enum):
    WAITING = "waiting"     # في الطابور
    SERVING = "serving"     # يُخدَم الآن
    DONE = "done"           # انتهى
    CANCELLED = "cancelled" # أُلغي


class OrderStatus(str, enum.Enum):
    PENDING = "pending"         # بانتظار قبول التاجر
    ACCEPTED = "accepted"       # قبله التاجر
    PREPARING = "preparing"     # قيد التحضير
    READY = "ready"             # جاهز للاستلام
    PICKED_UP = "picked_up"     # استلمه السائق
    ON_THE_WAY = "on_the_way"   # في الطريق
    DELIVERED = "delivered"     # سُلّم
    CANCELLED = "cancelled"     # أُلغي


class PaymentMethod(str, enum.Enum):
    CASH = "cash"               # نقداً عند الاستلام
    CARD = "card"               # بطاقة (لاحقاً)


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    REFUNDED = "refunded"
