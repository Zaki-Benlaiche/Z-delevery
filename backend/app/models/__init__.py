"""تجميع كل النماذج ليكتشفها SQLAlchemy و Alembic"""
from app.models.driver import Driver
from app.models.merchant import Merchant, Product
from app.models.order import Order, OrderItem, OrderTracking
from app.models.rating import Rating
from app.models.user import Address, User

__all__ = [
    "User",
    "Address",
    "Merchant",
    "Product",
    "Driver",
    "Order",
    "OrderItem",
    "OrderTracking",
    "Rating",
]
