"""اختبار تكامل: دورة حياة طلب كامل — زبون → تاجر → سائق → تسليم."""
import pytest

pytestmark = pytest.mark.integration


async def _sign_in(client, phone: str, name: str, role: str) -> dict:
    """ينشئ مستخدماً ويعيد توكن + رؤوس Authorization جاهزة."""
    r = await client.post("/api/auth/send-otp", json={"phone": phone})
    code = r.json()["dev_otp"]
    r = await client.post(
        "/api/auth/verify-otp",
        json={"phone": phone, "code": code, "name": name, "role": role},
    )
    body = r.json()
    return {
        "user_id": body["user_id"],
        "token": body["access_token"],
        "headers": {"Authorization": f"Bearer {body['access_token']}"},
    }


async def test_full_order_lifecycle(app_client):
    # 1) إنشاء تاجر + متجر + منتج
    merchant_owner = await _sign_in(app_client, "0555100001", "تاجر", "merchant")
    r = await app_client.post(
        "/api/merchants",
        headers=merchant_owner["headers"],
        json={
            "name": "بيتزا الاختبار",
            "type": "restaurant",
            "lat": 36.7538,
            "lng": 3.0588,
        },
    )
    assert r.status_code == 201
    merchant_id = r.json()["id"]

    r = await app_client.post(
        f"/api/merchants/{merchant_id}/products",
        headers=merchant_owner["headers"],
        json={"name": "مارغريتا", "price": 900},
    )
    assert r.status_code == 201
    product_id = r.json()["id"]

    # 2) إنشاء زبون + عنوان
    customer = await _sign_in(app_client, "0555100002", "زبون", "customer")
    r = await app_client.post(
        "/api/addresses",
        headers=customer["headers"],
        json={"label": "المنزل", "lat": 36.7600, "lng": 3.0700},
    )
    assert r.status_code == 201
    address_id = r.json()["id"]

    # 3) إنشاء الطلب
    r = await app_client.post(
        "/api/orders",
        headers=customer["headers"],
        json={
            "merchant_id": merchant_id,
            "items": [{"product_id": product_id, "qty": 2}],
            "address_id": address_id,
            "payment_method": "cash",
        },
    )
    assert r.status_code == 201
    order = r.json()
    order_id = order["id"]
    assert order["status"] == "pending"
    assert order["subtotal"] == 1800.0  # 900 × 2
    assert order["total"] > order["subtotal"]  # يشمل التوصيل

    # 4) التاجر يقبل الطلب ثم يحضّر ثم جاهز
    for new_status in ("accepted", "preparing", "ready"):
        r = await app_client.post(
            f"/api/orders/{order_id}/status",
            headers=merchant_owner["headers"],
            json={"status": new_status},
        )
        assert r.status_code == 200, r.text
        assert r.json()["status"] == new_status

    # 5) إنشاء سائق وتسجيله
    driver = await _sign_in(app_client, "0555100003", "سائق", "driver")
    r = await app_client.post(
        "/api/drivers/register",
        headers=driver["headers"],
        json={"vehicle_type": "moto"},
    )
    assert r.status_code == 201

    # 6) السائق يستلم الطلب
    r = await app_client.post(
        f"/api/drivers/orders/{order_id}/claim",
        headers=driver["headers"],
    )
    assert r.status_code == 200, r.text

    # 7) السائق يتقدّم: picked_up → on_the_way → delivered
    for new_status in ("picked_up", "on_the_way", "delivered"):
        r = await app_client.post(
            f"/api/orders/{order_id}/status",
            headers=driver["headers"],
            json={"status": new_status},
        )
        assert r.status_code == 200, r.text

    # 8) بعد التسليم: payment_status يصير paid تلقائياً للنقد
    r = await app_client.get(f"/api/orders/{order_id}", headers=customer["headers"])
    final = r.json()
    assert final["status"] == "delivered"
    assert final["payment_status"] == "paid"

    # 9) سجلّ التتبّع يحتوي قيداً لكل انتقال
    r = await app_client.get(
        f"/api/orders/{order_id}/tracking", headers=customer["headers"]
    )
    tracking = r.json()
    statuses = [t["status"] for t in tracking]
    assert "pending" in statuses
    assert "delivered" in statuses


async def test_customer_cannot_change_status(app_client):
    """الزبون لا يستطيع تجاوز انتقالات الحالة."""
    merchant = await _sign_in(app_client, "0555200001", "تاجر", "merchant")
    customer = await _sign_in(app_client, "0555200002", "زبون", "customer")

    r = await app_client.post(
        "/api/merchants",
        headers=merchant["headers"],
        json={"name": "م", "type": "restaurant", "lat": 36.0, "lng": 3.0},
    )
    merchant_id = r.json()["id"]
    r = await app_client.post(
        f"/api/merchants/{merchant_id}/products",
        headers=merchant["headers"],
        json={"name": "p", "price": 100},
    )
    pid = r.json()["id"]

    r = await app_client.post(
        "/api/orders",
        headers=customer["headers"],
        json={
            "merchant_id": merchant_id,
            "items": [{"product_id": pid, "qty": 1}],
            "lat": 36.1,
            "lng": 3.1,
            "payment_method": "cash",
        },
    )
    order_id = r.json()["id"]

    # الزبون يحاول قبول طلبه بنفسه — يجب أن يفشل
    r = await app_client.post(
        f"/api/orders/{order_id}/status",
        headers=customer["headers"],
        json={"status": "accepted"},
    )
    assert r.status_code == 400


async def test_other_customer_cannot_view_order(app_client):
    """عزل البيانات: زبون لا يرى طلبات زبون آخر."""
    merchant = await _sign_in(app_client, "0555300001", "م", "merchant")
    customer_a = await _sign_in(app_client, "0555300002", "أ", "customer")
    customer_b = await _sign_in(app_client, "0555300003", "ب", "customer")

    r = await app_client.post(
        "/api/merchants",
        headers=merchant["headers"],
        json={"name": "م", "type": "restaurant", "lat": 36.0, "lng": 3.0},
    )
    merchant_id = r.json()["id"]
    r = await app_client.post(
        f"/api/merchants/{merchant_id}/products",
        headers=merchant["headers"],
        json={"name": "p", "price": 100},
    )
    pid = r.json()["id"]

    r = await app_client.post(
        "/api/orders",
        headers=customer_a["headers"],
        json={
            "merchant_id": merchant_id,
            "items": [{"product_id": pid, "qty": 1}],
            "lat": 36.1,
            "lng": 3.1,
            "payment_method": "cash",
        },
    )
    order_id = r.json()["id"]

    # B لا يجب أن يرى طلب A
    r = await app_client.get(f"/api/orders/{order_id}", headers=customer_b["headers"])
    assert r.status_code == 403
