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
├── mobile/                 # تطبيق الزبون + السائق — Expo SDK 56 + TypeScript
│   └── src/
│       ├── api/            # عميل HTTP لكل المسارات
│       ├── auth/           # تخزين توكن آمن + سياق الجلسة
│       ├── screens/        # تسجيل، OTP، الرئيسية، المتجر، السلّة، العناوين، الطلبات، التتبّع
│       ├── screens/driver/ # السائق: تسجيل، الواجهة الرئيسية، تفاصيل الطلب
│       ├── store/cart.ts   # سلّة zustand
│       └── hooks/          # موقع المستخدم + WebSocket + بثّ موقع السائق
├── web/                    # لوحة التاجر — Vite + React 19 + TypeScript
│   └── src/
│       ├── api/            # عميل HTTP (مشترك المنطق مع mobile)
│       ├── auth/           # تخزين localStorage + سياق
│       └── pages/          # Login، Setup، Orders، Products، Settings
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

**اختبارات:**
```powershell
pip install -r requirements-dev.txt
pytest                       # 35+ اختبار وحدة (يعمل بلا قاعدة بيانات)
pytest -m integration        # اختبارات تكامل (تحتاج zdelivry_test في Postgres)
```
- التوثيق التفاعلي: http://localhost:8000/docs
- فحص الصحّة: http://localhost:8000/health

> **بيانات تجريبية:** بعد أوّل إقلاع للخادم (لإنشاء الجداول)، شغّل `python seed.py` من داخل `backend/` لإضافة 4 متاجر + 16 منتجاً في الجزائر العاصمة.

### 3) تطبيق الزبون والسائق (Mobile)
```powershell
cd mobile
npm install
npx expo start
```
ثم امسح QR من تطبيق **Expo Go** على هاتفك (على نفس Wi-Fi).
> اختيار الدور يحدث عند أوّل تسجيل من شاشة OTP (زبون/سائق) — تطبيق واحد، تجربتان حسب الدور.
> الجهاز الحقيقي يحتاج تعديل `EXPO_PUBLIC_API_URL` ليشير إلى IP حاسوبك على الشبكة بدلاً من `10.0.2.2` (الذي يصلح فقط لمحاكي Android).

### 4) لوحة التاجر (Web)
```powershell
cd web
npm install
npm run dev
```
افتح http://localhost:5173 — سجّل بدور `merchant`، أنشئ متجرك من شاشة Setup، ثم استقبل الطلبات في صفحة "الطلبات" (تحديث تلقائي كل 5 ثوانٍ).
> يمكن تجاوز عنوان الـ Backend عبر `VITE_API_URL` في `.env.local`.

## خريطة الـ API

| المسار | الدور |
|---|---|
| `POST /api/auth/send-otp` · `POST /api/auth/verify-otp` | مصادقة OTP وإصدار JWT |
| `GET /api/merchants` (مع `lat`/`lng`/`q`/`type`/`open_only`) | قائمة التجّار مرتّبة بالأقرب |
| `GET /api/merchants/{id}` · `POST/PATCH /api/merchants` · `GET /api/merchants/me` | تفاصيل وإنشاء/تعديل + متجري (للتاجر) |
| `POST/PATCH/DELETE /api/merchants/{id}/products/...` | إدارة منتجات المتجر |
| `GET/POST/DELETE /api/addresses` | عناوين الزبون |
| `POST /api/orders` · `GET /api/orders` · `GET /api/orders/{id}` | إنشاء طلب واستعراضه (مرشّح حسب الدور تلقائياً) |
| `POST /api/orders/{id}/status` · `POST /api/orders/{id}/cancel` | تغيير الحالة (مع جدول انتقالات صارم) |
| `GET /api/orders/{id}/tracking` | سجلّ كامل لتقدّم الطلب |
| `POST /api/drivers/register` · `/online` · `/location` · `/available-orders` · `/orders/{id}/claim` | السائق: تسجيل، حضور، موقع لحظي، استلام |
| `POST/DELETE /api/me/push-token` | تسجيل/إلغاء توكن Expo Push للمستخدم |
| `WS /api/ws/orders/{id}?token=...` | بثّ حالة الطلب وموقع السائق لحظياً |

## الأداء

- **GZip middleware** للاستجابات الأكبر من 1KB — يخفّض حجم النقل ~70٪ على JSON
- **Pagination** على قوائم التجّار والطلبات (`limit`، `offset`؛ افتراضياً 50، أقصاه 100)
- **GIST spatial index** تلقائي على أعمدة Geography (PostGIS)
- **Debounce 350ms** على بحث الواجهة (الموبايل) — يقلّل ضربات الـ API بنحو 10×
- **`placeholderData`** في React Query — يمنع وميض الشاشة بين تحديثات الاستعلامات الدورية

## الإشعارات

**التاجر (ويب):** عند وصول طلب جديد يُصدر المتصفّح نغمة قصيرة + إشعار نظام (يطلب الإذن مرّة واحدة).

**الزبون والسائق (موبايل):** عبر Expo Push.
- التطبيق يطلب الإذن تلقائياً بعد تسجيل الدخول ويسجّل التوكن في `/me/push-token`
- الـ Backend يُرسل إشعاراً للزبون عند كل تغيير حالة، وللتاجر عند كل طلب جديد
- يعمل على الأجهزة الحقيقية فقط (المحاكي لا يدعم Expo Push)
- في الـ build الإنتاجي يجب تمرير `projectId` من EAS لـ `getExpoPushTokenAsync`

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
- [x] **المرحلة 1:** المطاعم/المنتجات + الطلبات + التتبّع اللحظي + تطبيق الزبون + تطبيق السائق + لوحة التاجر (MVP كامل)
- [ ] **المرحلة 2:** التقييمات + الكوبونات + التقارير + توثيق السائقين + مدينة ثانية
- [ ] **المرحلة 3:** الدفع الإلكتروني + التوسّع
