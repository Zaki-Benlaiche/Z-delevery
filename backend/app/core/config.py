"""إعدادات التطبيق — تُقرأ من متغيّرات البيئة / ملف .env"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Z-delivry"
    debug: bool = True

    database_url: str = "postgresql+asyncpg://zdelivry:zdelivry_dev_pass@localhost:5432/zdelivry"
    redis_url: str = "redis://localhost:6379/0"

    secret_key: str = "change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30

    otp_expire_seconds: int = 300
    otp_dev_mode: bool = True  # في وضع التطوير: يُرجع الرمز في الاستجابة بدل إرسال SMS

    # تسعير الطلبات
    delivery_base_fee: float = 200.0   # رسوم التوصيل الأساسية (دج)
    delivery_fee_per_km: float = 30.0  # رسوم إضافية لكل كيلومتر (دج)
    commission_rate: float = 0.10      # نسبة عمولة المنصّة من قيمة الطلب

    # أرقام هواتف الأدمن (مفصولة بفاصلة) — يُرقَّون تلقائياً عند تسجيل الدخول
    admin_phones: str = ""

    @property
    def admin_phone_set(self) -> set[str]:
        return {p.strip() for p in self.admin_phones.split(",") if p.strip()}

    # CORS: نطاقات الواجهات المسموح لها (مفصولة بفاصلة). "*" يعني الكل (للتطوير فقط)
    allow_origins: str = "*"

    @property
    def cors_origins(self) -> list[str]:
        items = [o.strip() for o in self.allow_origins.split(",") if o.strip()]
        return items if items else ["*"]


settings = Settings()
