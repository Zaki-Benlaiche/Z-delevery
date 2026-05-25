# Z-delivry Backend — صورة إنتاج
FROM python:3.12-slim

# سجلّات Python بدون buffer (مفيد لـ Docker logs)
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# مكتبات النظام للبناء (libpq لـ asyncpg، gcc للحزم التي تُبنى)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

# تثبيت المتطلّبات أولاً (يستفيد من cache طبقات Docker عند تغيير الكود فقط)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# تشغيل بمستخدم غير-root للأمان
RUN useradd --create-home --shell /bin/bash app
COPY --chown=app:app . .
USER app

# المنفذ يأتي من البيئة (Railway/Render يحقنان $PORT)
ENV PORT=8000
EXPOSE 8000

# Healthcheck — يساعد Railway/Render على معرفة جاهزية الخدمة
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:${PORT}/health || exit 1

# proxy-headers مهمّ خلف reverse proxy (Railway/Render)
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'
