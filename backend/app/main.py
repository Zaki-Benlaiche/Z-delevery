"""نقطة دخول تطبيق Z-delivry — Backend"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy import text

from app.api.routers import addresses, admin, auth, drivers, me, merchants, offers, orders, tracking
from app.core.config import settings
from app.core.database import Base, engine

# استيراد النماذج لتسجيلها لدى SQLAlchemy
from app import models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    # تحذير صارم لو ما زال السرّ الافتراضي مستخدماً في إنتاج
    if not settings.debug and settings.secret_key in ("change-me", "change-this-secret-key-in-production-please"):
        raise RuntimeError(
            "SECRET_KEY ما زال على القيمة الافتراضية! ولّد مفتاحاً قوياً وضعه في .env قبل الإقلاع في الإنتاج."
        )
    # عند الإقلاع: تفعيل PostGIS وإنشاء الجداول (للتطوير؛ في الإنتاج نستخدم Alembic)
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        await conn.run_sync(Base.metadata.create_all)

    # ترحيل تصنيف المتجر: enum قديم (restaurant/clothing/other) → نصّ (food/fresh/market)
    # كل عبارة في معاملة مستقلّة (idempotent) — وتُقتبس "type" لأنّها كلمة محجوزة في Postgres
    async def _safe_exec(sql: str) -> None:
        try:
            async with engine.begin() as conn:
                await conn.execute(text(sql))
        except Exception:
            pass

    # عمود صورة الملف الشخصي للمستخدم (create_all لا يضيف أعمدة لجدول موجود)
    await _safe_exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)")

    await _safe_exec('ALTER TABLE merchants ALTER COLUMN "type" TYPE VARCHAR(20) USING "type"::text')
    # القيم القديمة قد تكون بأحرف كبيرة (أسماء enum) أو صغيرة (قيمه) — نطابق الحالتين
    await _safe_exec("UPDATE merchants SET \"type\"='food' WHERE lower(\"type\")='restaurant'")
    await _safe_exec("UPDATE merchants SET \"type\"='market' WHERE lower(\"type\") IN ('other','clothing')")
    await _safe_exec("UPDATE merchants SET \"type\"='food' WHERE \"type\" NOT IN ('food','fresh','market')")

    # مصالحة أدوار الأدمن مع ADMIN_PHONES (المصدر الوحيد للحقيقة):
    # نرقّي أرقام القائمة، وننزع الصلاحية عن أيّ أدمن رقمه ليس فيها (لأنّ الترقية لا تُلغى تلقائياً).
    try:
        from sqlalchemy import select
        from app.core.database import AsyncSessionLocal
        from app.models.enums import UserRole
        from app.models.user import User

        admins = settings.admin_phone_set
        async with AsyncSessionLocal() as session:
            users = (await session.execute(select(User))).scalars().all()
            changed = False
            for u in users:
                if u.phone in admins and u.role != UserRole.ADMIN:
                    u.role = UserRole.ADMIN
                    changed = True
                elif u.phone not in admins and u.role == UserRole.ADMIN:
                    u.role = UserRole.CUSTOMER
                    changed = True
            if changed:
                await session.commit()
    except Exception:
        pass

    # تطبيع أرقام الهواتف إلى صيغة +213 (أثر تحويل الموبايل للصيغة الدولية).
    # عند تعارض رقمين على نفس الصيغة المعيارية (حساب قديم بمتجر + حساب فارغ مكرّر)،
    # نُبقي صاحب البيانات (متجر/طلبات/سائق) على الرقم المعياري و"نركن" الفارغ برقم غير معياري.
    try:
        from sqlalchemy import select, func
        from app.core.database import AsyncSessionLocal
        from app.core.phone import normalize_phone
        from app.models.user import User
        from app.models.merchant import Merchant
        from app.models.order import Order
        from app.models.driver import Driver

        async def _has_data(session, uid) -> bool:
            m = await session.scalar(select(func.count()).select_from(Merchant).where(Merchant.user_id == uid))
            d = await session.scalar(select(func.count()).select_from(Driver).where(Driver.user_id == uid))
            o = await session.scalar(
                select(func.count()).select_from(Order).where((Order.customer_id == uid) | (Order.driver_id == uid))
            )
            return bool((m or 0) or (d or 0) or (o or 0))

        async with AsyncSessionLocal() as session:
            users = (await session.execute(select(User))).scalars().all()
            groups: dict[str, list] = {}
            for u in users:
                groups.setdefault(normalize_phone(u.phone), []).append(u)

            # حدّد الأساسي (صاحب البيانات) لكل مجموعة
            primary_by_norm: dict[str, object] = {}
            for norm, group in groups.items():
                if len(group) == 1:
                    primary_by_norm[norm] = group[0]
                    continue
                primary = None
                for u in group:
                    if await _has_data(session, u.id):
                        primary = u
                        break
                primary_by_norm[norm] = primary or group[0]

            # المرحلة 1: اركن غير-الأساسي برقم فريد غير معياري ثمّ احفظ — لتحرير الرقم المعياري
            parked_any = False
            for norm, group in groups.items():
                for u in group:
                    if u is not primary_by_norm[norm]:
                        u.phone = f"x{str(u.id).replace('-', '')[:18]}"
                        parked_any = True
            if parked_any:
                await session.flush()

            # المرحلة 2: طبّع الأساسي لكل مجموعة (الرقم المعياري صار متاحاً)
            changed = parked_any
            for norm, primary in primary_by_norm.items():
                if primary.phone != norm:
                    primary.phone = norm
                    changed = True
            if changed:
                await session.commit()
    except Exception:
        pass

    # مصالحة دور أصحاب المتاجر والسائقين: سجلّات قديمة أُنشئت قبل ترقية الدور التلقائية
    # قد يكون دورها ما زال "customer" رغم امتلاكها متجراً أو حساب سائق → نرقّيها.
    # (لا نمسّ الأدمن — مصالحته تمّت أعلاه من ADMIN_PHONES.)
    try:
        from sqlalchemy import select
        from app.core.database import AsyncSessionLocal
        from app.models.enums import UserRole
        from app.models.user import User
        from app.models.merchant import Merchant
        from app.models.driver import Driver

        async with AsyncSessionLocal() as session:
            merchant_owner_ids = set(
                (await session.execute(select(Merchant.user_id))).scalars().all()
            )
            driver_user_ids = set(
                (await session.execute(select(Driver.user_id))).scalars().all()
            )
            changed = False
            for uid in merchant_owner_ids:
                u = await session.get(User, uid)
                if u is not None and u.role == UserRole.CUSTOMER:
                    u.role = UserRole.MERCHANT
                    changed = True
            for uid in driver_user_ids:
                u = await session.get(User, uid)
                if u is not None and u.role == UserRole.CUSTOMER:
                    u.role = UserRole.DRIVER
                    changed = True
            if changed:
                await session.commit()
    except Exception:
        pass

    yield
    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="منصّة توصيل الطلبات — Z-delivry API",
    lifespan=lifespan,
)

# GZip يضغط استجابات JSON ≥ 1KB — مكسب كبير على الشبكات البطيئة
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(me.router, prefix="/api")
app.include_router(merchants.router, prefix="/api")
app.include_router(offers.router, prefix="/api")
app.include_router(addresses.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(drivers.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(tracking.router, prefix="/api")


@app.get("/", tags=["النظام"])
async def root():
    return {"app": settings.app_name, "status": "ok", "docs": "/docs"}


@app.get("/health", tags=["النظام"])
async def health():
    return {"status": "healthy"}
