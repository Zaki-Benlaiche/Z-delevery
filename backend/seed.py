"""بيانات تجريبية لبدء سريع — يضيف 4 تجّار + منتجاتهم في الجزائر العاصمة.

التشغيل:
    python -m seed

يتطلّب أن تكون قاعدة البيانات قيد التشغيل (docker compose up -d) وأن تكون
الجداول قد أُنشئت (يحدث تلقائياً عند أوّل إقلاع للخادم).
"""
import asyncio

from sqlalchemy import select

from app.core.database import AsyncSessionLocal, Base, engine
from app.core.geo import make_point
from app.models.enums import MerchantType, UserRole, UserStatus
from app.models.merchant import Merchant, Product
from app.models.user import User


# تجّار تجريبيون موزّعون في أحياء مختلفة من الجزائر العاصمة
SEED = [
    {
        "owner_phone": "0555000001",
        "owner_name": "مالك المطعم الأوّل",
        "merchant": {
            "name": "مطعم البحر",
            "type": MerchantType.RESTAURANT,
            "description": "أطباق بحرية طازجة من ميناء الجزائر",
            "open_hours": "11:00 - 23:00",
            "lat": 36.7755,
            "lng": 3.0589,  # باب الواد
        },
        "products": [
            ("سمك الدوراد مشوي", "مع الأرز والسلطة", 1800, "أطباق رئيسية"),
            ("ربيان بالكاري", "ربيان طازج بصلصة الكاري", 2200, "أطباق رئيسية"),
            ("سلطة بحرية", "تشكيلة من ثمار البحر", 800, "مقبّلات"),
            ("عصير برتقال طازج", None, 250, "مشروبات"),
        ],
    },
    {
        "owner_phone": "0555000002",
        "owner_name": "مالك البيتزا",
        "merchant": {
            "name": "بيتزا روما",
            "type": MerchantType.RESTAURANT,
            "description": "بيتزا إيطالية أصيلة بفرن الحطب",
            "open_hours": "12:00 - 00:00",
            "lat": 36.7600,
            "lng": 3.0500,  # حيدرة
        },
        "products": [
            ("مارغريتا", "طماطم، موزاريلا، ريحان", 900, "بيتزا"),
            ("بيبروني", "بيتزا بالبيبروني والجبن", 1100, "بيتزا"),
            ("كالزوني", "بيتزا مطويّة محشوّة", 1200, "بيتزا"),
            ("تيراميسو", "حلوى إيطالية تقليدية", 400, "حلويات"),
        ],
    },
    {
        "owner_phone": "0555000003",
        "owner_name": "مالك البرغر",
        "merchant": {
            "name": "Burger House",
            "type": MerchantType.RESTAURANT,
            "description": "وجبات سريعة طازجة",
            "open_hours": "10:00 - 02:00",
            "lat": 36.7320,
            "lng": 3.0860,  # حسين داي
        },
        "products": [
            ("كلاسيك برغر", "لحم بقري + جبن + خضار", 700, "برغر"),
            ("دبل تشيز", "طبقتان من اللحم والجبن", 1000, "برغر"),
            ("بطاطس مقلية كبير", None, 250, "إضافات"),
            ("ميلك شيك شوكولا", None, 350, "مشروبات"),
        ],
    },
    {
        "owner_phone": "0555000004",
        "owner_name": "مالك المحل",
        "merchant": {
            "name": "محل الأناقة",
            "type": MerchantType.CLOTHING,
            "description": "ملابس عصرية للرجال والنساء",
            "open_hours": "09:00 - 21:00",
            "lat": 36.7450,
            "lng": 3.0700,  # القبّة
        },
        "products": [
            ("قميص قطن رجالي", "متوفّر بألوان متعدّدة", 2800, "رجالي"),
            ("فستان صيفي", "قماش خفيف، مقاسات S-XL", 4500, "نسائي"),
            ("جينز كلاسيك", "قصّة مستقيمة", 3200, "رجالي"),
            ("حقيبة يد", "جلد طبيعي", 5500, "إكسسوارات"),
        ],
    },
]


async def upsert_merchant(db, data: dict) -> None:
    """ينشئ المستخدم-المالك والمتجر ومنتجاته إن لم يكونوا موجودين."""
    phone = data["owner_phone"]

    user = (await db.execute(select(User).where(User.phone == phone))).scalar_one_or_none()
    if user is None:
        user = User(
            phone=phone,
            name=data["owner_name"],
            role=UserRole.MERCHANT,
            status=UserStatus.ACTIVE,
        )
        db.add(user)
        await db.flush()

    merchant = (
        await db.execute(select(Merchant).where(Merchant.user_id == user.id))
    ).scalar_one_or_none()
    if merchant is None:
        m_data = data["merchant"]
        merchant = Merchant(
            user_id=user.id,
            name=m_data["name"],
            type=m_data["type"],
            description=m_data["description"],
            open_hours=m_data["open_hours"],
            location=make_point(m_data["lat"], m_data["lng"]),
            is_open=True,
            rating=4.5,
        )
        db.add(merchant)
        await db.flush()
        print(f"  ✓ متجر جديد: {merchant.name}")
    else:
        print(f"  · موجود مسبقاً: {merchant.name}")

    # المنتجات: لا نُضيفها إن كان للمتجر منتجات سابقاً (لتفادي التكرار عند الإعادة)
    existing = (
        await db.execute(select(Product).where(Product.merchant_id == merchant.id))
    ).scalars().all()
    if existing:
        return

    for name, desc, price, category in data["products"]:
        db.add(
            Product(
                merchant_id=merchant.id,
                name=name,
                description=desc,
                price=price,
                category=category,
                available=True,
            )
        )
    print(f"     + {len(data['products'])} منتج")


async def main():
    # نضمن أن الجداول موجودة (لمن يشغّل seed قبل أن يُقلِع الخادم لأوّل مرّة)
    async with engine.begin() as conn:
        from sqlalchemy import text
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        await conn.run_sync(Base.metadata.create_all)

    print("بدء تعبئة البيانات التجريبية...")
    async with AsyncSessionLocal() as db:
        for entry in SEED:
            await upsert_merchant(db, entry)
        await db.commit()
    print("✓ اكتمل.")


if __name__ == "__main__":
    asyncio.run(main())
