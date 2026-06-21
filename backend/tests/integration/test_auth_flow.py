"""اختبار تكامل: تدفّق المصادقة عبر OTP بالكامل عبر HTTP."""
import pytest

pytestmark = pytest.mark.integration


async def test_send_and_verify_otp_creates_new_user(app_client):
    # 1) الإرسال يرجع dev_otp في وضع التطوير
    r = await app_client.post("/api/auth/send-otp", json={"phone": "0555123456"})
    assert r.status_code == 200
    code = r.json()["dev_otp"]
    assert code and code.isdigit()

    # 2) التحقّق ينشئ المستخدم ويُصدر التوكنات
    r = await app_client.post(
        "/api/auth/verify-otp",
        json={"phone": "0555123456", "code": code, "name": "زكريا"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["is_new_user"] is True
    assert body["role"] == "customer"
    assert body["access_token"]

    # 3) التحقّق ثانية بنفس الرمز يفشل (الرمز يُستهلَك)
    r = await app_client.post(
        "/api/auth/verify-otp",
        json={"phone": "0555123456", "code": code},
    )
    assert r.status_code == 400


async def test_returning_user_keeps_role(app_client):
    # سجّل تاجراً جديداً
    r1 = await app_client.post("/api/auth/send-otp", json={"phone": "0555999000"})
    code1 = r1.json()["dev_otp"]
    r2 = await app_client.post(
        "/api/auth/verify-otp",
        json={"phone": "0555999000", "code": code1, "name": "تاجر", "role": "merchant"},
    )
    assert r2.json()["role"] == "merchant"

    # العودة لاحقاً عبر «دخول الشركاء» (role=merchant) — يبقى تاجراً
    r3 = await app_client.post("/api/auth/send-otp", json={"phone": "0555999000"})
    code3 = r3.json()["dev_otp"]
    r4 = await app_client.post(
        "/api/auth/verify-otp",
        json={"phone": "0555999000", "code": code3, "role": "merchant"},
    )
    assert r4.status_code == 200
    assert r4.json()["role"] == "merchant"
    assert r4.json()["is_new_user"] is False


async def test_partner_phone_rejected_on_customer_entrance(app_client):
    # رقم مسجَّل كتاجر لا يُسمح له بالدخول عبر بوابة الزبون — يُطلب رقم آخر
    r1 = await app_client.post("/api/auth/send-otp", json={"phone": "0555888111"})
    code1 = r1.json()["dev_otp"]
    r2 = await app_client.post(
        "/api/auth/verify-otp",
        json={"phone": "0555888111", "code": code1, "name": "تاجر", "role": "merchant"},
    )
    assert r2.json()["role"] == "merchant"

    # محاولة الدخول كزبون بنفس الرقم — مرفوضة (409)
    r3 = await app_client.post("/api/auth/send-otp", json={"phone": "0555888111"})
    code3 = r3.json()["dev_otp"]
    r4 = await app_client.post(
        "/api/auth/verify-otp",
        json={"phone": "0555888111", "code": code3, "role": "customer"},
    )
    assert r4.status_code == 409


async def test_invalid_phone_returns_422(app_client):
    r = await app_client.post("/api/auth/send-otp", json={"phone": "x"})
    assert r.status_code == 422


async def test_protected_endpoint_requires_token(app_client):
    r = await app_client.get("/api/addresses")
    assert r.status_code == 403  # HTTPBearer (auto_error) يُرجع 403 بدون توكن
