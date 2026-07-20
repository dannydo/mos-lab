"""
lib/phone.py
------------
Vietnamese phone number regex and normalization utility.
"""

import re

PHONE_REGEX = re.compile(r"(?:0|\+84)(?:3[2-9]|5[25689]|7[0|6-9]|8[1-9]|9[0-9])\d{7}\b")


def normalize_phone(phone: str) -> str:
    """Normalize a Vietnamese phone number: strip non-digits, convert +84 → 0."""
    if not phone:
        return None
    # Extract digits only
    digits = re.sub(r"\D", "", phone)
    if digits.startswith("84") and len(digits) > 9:
        digits = "0" + digits[2:]
    return digits
