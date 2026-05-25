"""نقطة دخول تطبيق Z-delivry — Backend"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy import text

from app.api.routers import addresses, auth, drivers, me, merchants, orders, tracking
from app.core.config import settings
from app.core.database import Base, engine

# استيراد النماذج لتسجيلها لدى SQLAlchemy
from app import models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    # عند الإقلاع: تفعيل PostGIS وإنشاء الجداول (للتطوير؛ في الإنتاج نستخدم Alembic)
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        await conn.run_sync(Base.metadata.create_all)
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
    allow_origins=["*"],  # في الإنتاج: حدّد النطاقات المسموح بها
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(me.router, prefix="/api")
app.include_router(merchants.router, prefix="/api")
app.include_router(addresses.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(drivers.router, prefix="/api")
app.include_router(tracking.router, prefix="/api")


@app.get("/", tags=["النظام"])
async def root():
    return {"app": settings.app_name, "status": "ok", "docs": "/docs"}


@app.get("/health", tags=["النظام"])
async def health():
    return {"status": "healthy"}
