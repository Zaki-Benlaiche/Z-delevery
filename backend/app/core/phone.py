"""تطبيع أرقام الهاتف الجزائرية إلى صيغة موحّدة +213XXXXXXXXX"""
import re


def normalize_phone(raw: str) -> str:
    """يحوّل أيّ صيغة (0XXXXXXXXX / 213XXXXXXXXX / +213XXXXXXXXX) إلى +213XXXXXXXXX."""
    digits = re.sub(r"\D", "", raw or "")
    if digits.startswith("213"):
        digits = digits[3:]
    elif digits.startswith("0"):
        digits = digits[1:]
    return "+213" + digits
