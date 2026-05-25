"""اختبارات الأمان: تجزئة كلمات المرور وتوكنات JWT"""
import time

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_hash_verifies():
    h = hash_password("zaki123!")
    assert h != "zaki123!"
    assert verify_password("zaki123!", h)
    assert not verify_password("wrong", h)


def test_password_hash_is_salted():
    """نفس الكلمة تُنتج هاش مختلفاً بسبب الـ salt."""
    assert hash_password("same") != hash_password("same")


def test_access_token_roundtrip():
    token = create_access_token("user-123", "customer")
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "user-123"
    assert payload["role"] == "customer"
    assert payload["type"] == "access"


def test_refresh_token_has_type():
    token = create_refresh_token("user-x", "driver")
    payload = decode_token(token)
    assert payload is not None
    assert payload["type"] == "refresh"


def test_decode_invalid_token_returns_none():
    """التوكن المُعطَّل لا يُرفع استثناء — يُعاد None ليتعامل معه الـ caller."""
    assert decode_token("not.a.valid.token") is None
    assert decode_token("") is None


def test_token_includes_expiration():
    token = create_access_token("u", "customer")
    payload = decode_token(token)
    assert payload is not None
    assert "exp" in payload
    assert payload["exp"] > time.time()
