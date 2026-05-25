# دليل نشر Z-delivry

من المتجر المحلّي إلى الإنتاج في ~30 دقيقة.

## نظرة عامّة

| المكوّن | المستضيف | التكلفة |
|---|---|---|
| Backend (FastAPI + Postgres + Redis) | Railway.app | $5/شهر credit مجاني |
| Web (لوحة التاجر) | Vercel | مجاني |
| Mobile | Expo Go (للاختبار) → EAS Build لاحقاً | مجاني |

---

## 1) Backend على Railway

### الخطوات

1. سجّل في https://railway.app عبر GitHub
2. **New Project → Deploy from GitHub Repo** → اختر `Zaki-Benlaiche/Z-delevery`
3. Railway سيكتشف `backend/Dockerfile` تلقائياً
4. في إعدادات الخدمة: **Settings → Root Directory** اضبطه على `backend`
5. **+ New → Database → Add PostgreSQL**
6. **+ New → Database → Add Redis**

### تفعيل PostGIS

PostgreSQL في Railway افتراضياً لا يحوي PostGIS. خياران:

**أ) الأبسط:** اذهب لقاعدة البيانات في Railway → **Data** أو **Query** → نفّذ:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```
(الـ Backend يفعّلها لاحقاً تلقائياً في lifespan لكن قد لا تكون لـ Railway user صلاحية، فالأفضل تنفيذها مرّة من واجهة Railway).

**ب) إن لم تنجح:** استبدل صورة Postgres بـ `postgis/postgis:16-3.4`:
- في إعدادات قاعدة البيانات على Railway → **Settings → Source Image** → ضع `postgis/postgis:16-3.4`

### متغيّرات البيئة (Variables)

في الخدمة (الـ Backend، ليس DB)، **Variables** أضف:

| المتغيّر | القيمة |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |
| `SECRET_KEY` | ولّد بـ `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `DEBUG` | `false` |
| `OTP_DEV_MODE` | `false` (في الإنتاج، أو true حتى تربط مزوّد SMS) |
| `ADMIN_PHONES` | `0555000000` (رقمك) |
| `ALLOW_ORIGINS` | `https://YOUR-DOMAIN.vercel.app` (سنحدّثه بعد deploy الويب) |

> الـ Backend يحوّل تلقائياً `postgresql://` إلى `postgresql+asyncpg://` (في `database.py`)، فلا داعي لتعديل القيمة يدوياً.

### الـ Deploy

اضغط **Deploy** أو ادفع commit جديد — Railway سيبني ويُشغّل تلقائياً. راقب الـ logs.

عند النجاح، **Settings → Networking → Generate Domain** يعطيك URL مثل `https://z-delevery-production.up.railway.app`.

اختبر: افتح `https://YOUR-URL/health` → يجب أن ترى `{"status":"healthy"}`.

---

## 2) Web (لوحة التاجر) على Vercel

1. سجّل في https://vercel.com عبر GitHub
2. **Add New → Project** → اختر مستودع `Z-delevery`
3. **Root Directory:** `web`
4. الـ Framework يُكتشف تلقائياً كـ Vite
5. **Environment Variables** أضف:
   - `VITE_API_URL` = `https://YOUR-RAILWAY-URL` (بدون `/api` في النهاية)
6. **Deploy**

عند انتهاء البناء، يعطيك Vercel URL مثل `https://z-delevery.vercel.app`.

**ارجع لـ Railway** وحدّث `ALLOW_ORIGINS` ليشمل هذا الـ URL.

---

## 3) Mobile

في `mobile/app.json` غيّر `extra.apiUrl` إلى URL الإنتاج:

```json
"extra": {
  "apiUrl": "https://YOUR-RAILWAY-URL"
}
```

أو الأفضل، أنشئ `mobile/.env`:
```
EXPO_PUBLIC_API_URL=https://YOUR-RAILWAY-URL
```

### للاختبار السريع (Expo Go)

```powershell
cd mobile
npx expo start --tunnel
```
المعامل `--tunnel` يفيد عندما لا يكون جهازك على نفس Wi-Fi (مثلاً من 4G).

### للنشر الفعلي (APK)

```powershell
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```
بعد ~10 دقائق ستحصل على رابط لتنزيل `.apk` يمكنك تثبيته أو مشاركته.

> Push Notifications تتطلّب `projectId` من EAS. سيُضاف تلقائياً عند تشغيل `eas build:configure`. ثم استخدمه في `usePushRegistration`:
> ```ts
> await Notifications.getExpoPushTokenAsync({ projectId: "YOUR-EAS-PROJECT-ID" });
> ```

---

## 4) إنشاء أوّل تاجر/سائق/أدمن في الإنتاج

1. من الويب: افتح `https://YOUR-VERCEL-URL/login` → سجّل بدور merchant → أنشئ متجرك
2. من الموبايل: سجّل سائقاً → سيظهر "بانتظار التوثيق"
3. سجّل من رقم في `ADMIN_PHONES` → دورك يصير admin
4. اذهب لـ Swagger في الـ Backend: `https://YOUR-RAILWAY-URL/docs` → سجّل دخولك (Authorize زر) → `POST /api/admin/drivers/{id}/verify`

أو، إن أضفت لوحة أدمن في web لاحقاً، تستطيع الإدارة من المتصفّح.

---

## 5) seed في الإنتاج (اختياري)

من Railway → الـ Backend service → **Shell** (إن توفّر) أو شغّل محلّياً مع DATABASE_URL يشير للإنتاج:
```powershell
cd backend
$env:DATABASE_URL="postgresql+asyncpg://..."
python seed.py
```

---

## مشكلات شائعة

| الخطأ | الحلّ |
|---|---|
| `SECRET_KEY ما زال على القيمة الافتراضية` | عيّن `SECRET_KEY` فعلي في Railway variables |
| `relation does not exist` | الخادم لم يُنشئ الجداول. تأكّد أن Postgres حيّ، أو شغّل seed يدوياً |
| `CORS error` في الـ web | أضف نطاق Vercel إلى `ALLOW_ORIGINS` في Railway |
| `Network request failed` في الموبايل | تأكّد من `EXPO_PUBLIC_API_URL` ومن أن الـ Backend يردّ على `/health` |
| `pg_dump_extension postgis` فاشل | شغّل `CREATE EXTENSION postgis` يدوياً من Railway query console |
