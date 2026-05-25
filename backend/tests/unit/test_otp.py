"""اختبارات خدمة OTP — تستخدم fakeredis بدل اتصال حقيقي"""
import pytest

from app.services.otp import generate_code, store_otp, verify_otp


def test_generate_code_format():
    code = generate_code()
    assert len(code) == 4
    assert code.isdigit()


async def test_store_and_verify_otp_success(fake_redis):
    """الرمز المُخزَّن يجب أن يَنجح في التحقّق الأوّل ثم يُمسح."""
    code = await store_otp("0555111222")
    assert code.isdigit()

    # نجاح أوّل تحقّق
    assert await verify_otp("0555111222", code) is True
    # ثاني تحقّق بنفس الرمز يجب أن يفشل — الرمز يُستهلَك مرّة واحدة
    assert await verify_otp("0555111222", code) is False


async def test_verify_wrong_code(fake_redis):
    code = await store_otp("0555000111")
    assert await verify_otp("0555000111", "9999" if code != "9999" else "8888") is False


async def test_verify_unknown_phone(fake_redis):
    """رقم لم يُرسَل له رمز أصلاً يجب أن يفشل التحقّق منه."""
    assert await verify_otp("0500000000", "1234") is False


async def test_store_overrides_previous_code(fake_redis):
    """إرسال رمز جديد يلغي الرمز السابق."""
    first = await store_otp("0555333444")
    second = await store_otp("0555333444")

    if first != second:
        assert await verify_otp("0555333444", first) is False
    assert await verify_otp("0555333444", second) is True
