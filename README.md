# Z-delivry 🛵

منصّة توصيل الطلبات للمطاعم ومحلات الملابس — تطبيق موبايل وويب موجّه للسوق الجزائري.

> راجع وثيقة المشروع الكاملة: [`Z-delivry-Plan.pdf`](./Z-delivry-Plan.pdf)

## البنية (Monorepo)

```
Z-delivry/
├── backend/                # FastAPI + PostgreSQL/PostGIS + Redis
│   └── app/
│       ├── core/           # الإعدادات، قاعدة البيانات، الأمان، الجغرافيا
│       ├── models/         # نماذج SQLAlchemy (User, Merchant, Product, Order, Driver, ...)
│       ├── schemas/        # مخططات Pydantic
│       ├── services/       # OTP، تسعير الطلبات، إدارة WebSocket
│       └── api/routers/    # auth / merchants / addresses / orders / drivers / tracking
├── mobile/                 # تطبيق الزبون — React Native + Expo (SDK 56) + TypeScript
│   └── src/
│       ├── api/            # عميل HTTP لكل المسارات
│       ├── auth/           # تخزين توكن آمن + سياق الجلسة
│       ├── screens/        # تسجيل، OTP، الرئيسية، المتجر، السلّة، العناوين، الطلبات، التتبّع
│       ├── store/cart.ts   # سلّة zustand
│       └── hooks/          # موقع المستخدم + WebSocket التتبّع اللحظي
└── docker-compose.yml      # قاعدة البيانات + Redis
```

## التقنيات

- **Backend:** FastAPI (Python 3.10+) — async، JWT، PostGIS لاستعلامات القرب، Redis للـ OTP
- **Mobile:** Expo SDK 56، React 19، RN 0.85، React Navigation 7، TanStack Query، Zustand، react-native-maps
- **التواصل اللحظي:** WebSocket على غرفة لكل طلب — تحديث الحالة وموقع السائق بالـ push

## التشغيل (للتطوير)

### 1) قاعدة البيانات و Redis
يتطلّب Docker Desktop قيد التشغيل:
```powershell
docker compose up -d
```

### 2) الـ Backend
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```
- التوثيق التفاعلي: http://localhost:8000/docs
- فحص الصحّة: http://localhost:8000/health

> **بيانات تجريبية:** بعد أوّل إقلاع للخادم (لإنشاء الجداول)، شغّل `python seed.py` من داخل `backend/` لإضافة 4 متاجر + 16 منتجاً في الجزائر العاصمة.

### 3) تطبيق الزبون
```powershell
cd mobile
npm install
npx expo start
```
ثم امسح QR من تطبيق **Expo Go** على هاتفك (على نفس Wi-Fi).
> الجهاز الحقيقي يحتاج تعديل `EXPO_PUBLIC_API_URL` ليشير إلى IP حاسوبك على الشبكة بدلاً من `10.0.2.2` (الذي يصلح فقط لمحاكي Android).

## خريطة الـ API

| المسار | الدور |
|---|---|
| `POST /api/auth/send-otp` · `POST /api/auth/verify-otp` | مصادقة OTP وإصدار JWT |
| `GET /api/merchants` (مع `lat`/`lng`/`q`/`type`/`open_only`) | قائمة التجّار مرتّبة بالأقرب |
| `GET /api/merchants/{id}` · `POST/PATCH /api/merchants` | تفاصيل وإنشاء/تعديل (للتاجر) |
| `POST/PATCH/DELETE /api/merchants/{id}/products/...` | إدارة منتجات المتجر |
| `GET/POST/DELETE /api/addresses` | عناوين الزبون |
| `POST /api/orders` · `GET /api/orders` · `GET /api/orders/{id}` | إنشاء طلب واستعراضه (مرشّح حسب الدور تلقائياً) |
| `POST /api/orders/{id}/status` · `POST /api/orders/{id}/cancel` | تغيير الحالة (مع جدول انتقالات صارم) |
| `GET /api/orders/{id}/tracking` | سجلّ كامل لتقدّم الطلب |
| `POST /api/drivers/register` · `/online` · `/location` · `/available-orders` · `/orders/{id}/claim` | السائق: تسجيل، حضور، موقع لحظي، استلام |
| `WS /api/ws/orders/{id}?token=...` | بثّ حالة الطلب وموقع السائق لحظياً |

## التسعير

يُحسَب تلقائياً عند إنشاء الطلب:
- **subtotal** = مجموع (سعر × الكمّية)
- **delivery_fee** = `DELIVERY_BASE_FEE` + `DELIVERY_FEE_PER_KM` × المسافة (هافرسين)
- **commission** = `COMMISSION_RATE` × subtotal (عمولة المنصّة)
- **total** = subtotal + delivery_fee

كل ثلاثة قابلة للتعديل في `.env`.

## تجربة المصادقة (OTP)

في وضع التطوير (`OTP_DEV_MODE=true`) يُعاد الرمز في الاستجابة لتسهيل الاختبار:
```
POST /api/auth/send-otp     { "phone": "0555123456" }
POST /api/auth/verify-otp   { "phone": "0555123456", "code": "1234", "name": "زكريا" }
```

## خارطة الطريق

- [x] **المرحلة 0:** تأسيس البنية + المصادقة بالـ OTP
- [x] **المرحلة 1:** المطاعم/المنتجات + الطلبات + التتبّع اللحظي + تطبيق الزبون (MVP)
- [ ] **المرحلة 2:** تطبيق التاجر/السائق + التقييمات + الكوبونات + التقارير + مدينة ثانية
- [ ] **المرحلة 3:** الدفع الإلكتروني + التوسّع
