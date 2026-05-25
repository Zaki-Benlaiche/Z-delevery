# دليل نشر Z-delivry

من المتجر المحلّي إلى الإنتاج في ~30 دقيقة.

## اختر مسارك

| المسار | التكلفة | المميّزات | العيوب |
|---|---|---|---|
| **Render (مجاني)** ← الافتراضي | $0 | PostGIS مُدمج، setup بنقرة عبر `render.yaml` | يَنام بعد 15د خمول، Postgres يحتاج إعادة إنشاء كلّ 90 يوماً، بدون Redis (نستخدم تخزيناً في الذاكرة) |
| **Railway** | $5 trial → $5/شهر بعدها | لا نوم، Redis مُدمج، أسرع | يحتاج بطاقة بعد الـ trial |

ابدأ بـ Render للنشر المجاني، انتقل لـ Railway/VPS لاحقاً عند الحاجة.

---

## المسار 1) Render — النشر المجاني (Recommended)

### 1.1 إنشاء الخدمات

1. سجّل في https://render.com عبر **GitHub**
2. **+ New → Blueprint** (وليس Web Service)
3. اختر مستودع `Zaki-Benlaiche/Z-delevery`
4. Render يكتشف `render.yaml` تلقائياً ويعرض ما سيُنشئه: خدمة `zdelivry-api` + قاعدة `zdelivry-db`
5. اضغط **Apply**
6. سيُطلب منك إدخال قيم الأسرار:
   - **ADMIN_PHONES** = رقم هاتفك (مثل `0555000000`) — يُرقَّى تلقائياً لـ admin عند تسجيل الدخول
7. اضغط **Create**

### 1.2 ماذا يحدث الآن؟
- Render يُنشئ Postgres مجانياً (PostgreSQL 16 + PostGIS متاح)
- يبدأ build للـ Backend من `backend/Dockerfile` (5-8 دقائق أوّل مرّة)
- بعد build، healthcheck `/health` يجب أن ينجح
- ستحصل على URL مثل `https://zdelivry-api.onrender.com`

### 1.3 تفعيل PostGIS (مرّة واحدة)

اذهب إلى لوحة `zdelivry-db` → **Connect** → انسخ "External Database URL" → استخدم أيّ عميل Postgres (DBeaver أو psql) ونفّذ:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

أو الأسهل: من **Shell** في لوحة الـ web service:
```bash
python -c "
import asyncio
from sqlalchemy import text
from app.core.database import engine
async def go():
    async with engine.begin() as c:
        await c.execute(text('CREATE EXTENSION IF NOT EXISTS postgis'))
asyncio.run(go())
"
```

ثم في `Manual Deploy → Clear build cache & deploy` لإعادة الإقلاع وتشغيل lifespan الذي يُنشئ الجداول.

### 1.4 تحقّق
```
https://YOUR-URL.onrender.com/health   →  {"status":"healthy"}
https://YOUR-URL.onrender.com/docs     →  Swagger UI
```

> **ملاحظة النوم:** الـ free tier ينام بعد 15د بدون طلبات. أوّل طلب بعدها يأخذ ~30 ثانية ليستيقظ. الحلّ: ادفع لخطّة Starter ($7/شهر) أو استخدم خدمة "uptime monitor" مجانية (مثل UptimeRobot) تطلب `/health` كل 5 دقائق.

---

## المسار 2) Backend على Railway

### الخطوات
1. سجّل في https://railway.app عبر GitHub
2. **New Project → Deploy from GitHub Repo** → `Z-delevery`
3. **Settings → Root Directory** = `backend`
4. **+ New → Database → Add PostgreSQL** + **Add Redis**
5. **مهمّ:** غيّر صورة Postgres في Settings → Source Image إلى `postgis/postgis:16-3.4`
6. أضف Variables (في Backend service → Variables → Raw Editor):
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
SECRET_KEY=<ولّد سلسلة طويلة>
DEBUG=false
OTP_DEV_MODE=true
ADMIN_PHONES=<رقمك>
ALLOW_ORIGINS=*
```
7. في Postgres → Data → نفّذ `CREATE EXTENSION IF NOT EXISTS postgis;`
8. **Redeploy** → عند النجاح **Generate Domain**

---

## 3) Web (لوحة التاجر) على Vercel

1. سجّل في https://vercel.com عبر GitHub
2. **Add New → Project** → اختر `Z-delevery`
3. **Root Directory:** `web`
4. **Environment Variables:**
   - `VITE_API_URL` = `https://YOUR-BACKEND-URL` (بدون `/api` في النهاية)
5. **Deploy**

عند الانتهاء، ارجع لإعدادات الـ Backend وحدّث `ALLOW_ORIGINS` ليشمل Vercel URL.

---

## 4) Mobile

عدّل `mobile/app.json` سطر `extra.apiUrl` إلى Backend URL:
```json
"extra": {
  "apiUrl": "https://zdelivry-api.onrender.com"
}
```

أو أنشئ `mobile/.env`:
```
EXPO_PUBLIC_API_URL=https://zdelivry-api.onrender.com
```

### اختبار سريع (Expo Go)
```powershell
cd mobile
npx expo start --tunnel
```

### نشر APK (EAS Build)
```powershell
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

---

## 5) أوّل أدمن / تاجر / سائق

1. **التاجر:** افتح web app → سجّل بدور merchant → أنشئ متجرك من شاشة Setup
2. **السائق:** افتح mobile → سجّل بدور driver → سيظهر "بانتظار التوثيق"
3. **الأدمن:** سجّل من رقم في `ADMIN_PHONES` → دورك يصير admin تلقائياً
4. من Swagger (`/docs`) → Authorize → نفّذ `POST /api/admin/drivers/{id}/verify` لتفعيل السائق

---

## مشكلات شائعة

| الخطأ | الحلّ |
|---|---|
| `SECRET_KEY ما زال على القيمة الافتراضية` | عيّن `SECRET_KEY` فعلي |
| `relation does not exist` | شغّل seed أو تأكّد من نجاح lifespan على الإقلاع الأوّل |
| `CORS error` في الويب | أضف نطاق Vercel/الويب إلى `ALLOW_ORIGINS` |
| `Network request failed` في الموبايل | تأكّد من `EXPO_PUBLIC_API_URL` ومن أن `/health` يردّ |
| Render خادم ينام كثيراً | UptimeRobot يضرب `/health` كل 5 دقائق (مجاني) |
| Postgres extension postgis فاشل | على Railway: غيّر صورة DB. على Render: PostGIS متاح، فقط `CREATE EXTENSION` |
