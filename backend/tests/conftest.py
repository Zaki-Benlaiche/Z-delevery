"""تهيئة pytest المشتركة.

اختبارات الوحدة (`tests/unit/`) لا تحتاج بنية تحتية. اختبارات التكامل
(`tests/integration/`) تحتاج Postgres+Redis وتُتجاوز تلقائياً عند عدم توفّرهما.
"""
import asyncio
import os
from typing import AsyncIterator

import pytest
import pytest_asyncio


# ---------- مسحٌ تلقائي لـ fakeredis في اختبارات OTP ----------
@pytest.fixture
def fake_redis(monkeypatch):
    """يحقن نسخة fakeredis كي تعمل خدمة OTP بلا اتصال شبكي."""
    import fakeredis.aioredis

    from app.services import otp as otp_mod

    fake = fakeredis.aioredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr(otp_mod, "_redis", fake)
    return fake


# ---------- كشف توفّر الـ Backend الحقيقي لاختبارات التكامل ----------
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://zdelivry:zdelivry_dev_pass@localhost:5432/zdelivry_test",
)


async def _can_connect_to_db(url: str, timeout: float = 2.0) -> bool:
    try:
        from sqlalchemy.ext.asyncio import create_async_engine

        engine = create_async_engine(url, connect_args={"timeout": timeout})
        async with engine.connect() as conn:
            from sqlalchemy import text

            await conn.execute(text("SELECT 1"))
        await engine.dispose()
        return True
    except Exception:
        return False


# نفحص مرّة واحدة عند بدء جلسة pytest
_DB_AVAILABLE: bool | None = None


def _db_available() -> bool:
    global _DB_AVAILABLE
    if _DB_AVAILABLE is None:
        _DB_AVAILABLE = asyncio.run(_can_connect_to_db(TEST_DATABASE_URL))
    return _DB_AVAILABLE


def pytest_collection_modifyitems(config, items):
    """يضع علامة skip تلقائياً على اختبارات التكامل إن لم تكن قاعدة البيانات متاحة."""
    if _db_available():
        return
    skip = pytest.mark.skip(reason="Postgres test DB غير متاحة — تجاوز اختبارات التكامل")
    for item in items:
        if "integration" in item.keywords:
            item.add_marker(skip)


# ---------- Fixtures لاختبارات التكامل ----------
@pytest_asyncio.fixture
async def app_client() -> AsyncIterator:
    """عميل HTTP غير-متزامن يخاطب التطبيق مباشرة عبر ASGI."""
    from httpx import ASGITransport, AsyncClient

    # نُعيد توجيه التطبيق إلى قاعدة الاختبار قبل استيرادها
    os.environ["DATABASE_URL"] = TEST_DATABASE_URL

    # نُجبر إعادة قراءة الإعدادات من البيئة
    from importlib import reload
    from app.core import config as config_mod
    from app.core import database as db_mod

    reload(config_mod)
    reload(db_mod)

    from app import main as main_mod
    reload(main_mod)

    from app.core.database import Base, engine
    from sqlalchemy import text

    # أنشئ الجداول وامسح المحتوى عند بداية كل اختبار
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncClient(
        transport=ASGITransport(app=main_mod.app), base_url="http://test"
    ) as client:
        yield client

    await engine.dispose()
