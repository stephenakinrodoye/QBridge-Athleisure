import base64
import hashlib
import hmac
from typing import Dict, Any
from .config import settings

def verify_shopify_hmac(raw_body: bytes, hmac_header: str) -> bool:
    """Verify Shopify webhook HMAC (X-Shopify-Hmac-Sha256)."""
    if not settings.shopify_webhook_secret:
        return False
    digest = hmac.new(
        settings.shopify_webhook_secret.encode("utf-8"),
        raw_body,
        hashlib.sha256
    ).digest()
    computed = base64.b64encode(digest).decode("utf-8")
    return hmac.compare_digest(computed, hmac_header or "")

def money_to_cents(amount: Any) -> int:
    """Shopify often sends amounts as strings like '123.45'."""
    if amount is None:
        return 0
    s = str(amount).strip()
    if s == "":
        return 0
    # Safe parsing to cents
    if "." in s:
        dollars, cents = s.split(".", 1)
        cents = (cents + "00")[:2]
    else:
        dollars, cents = s, "00"
    sign = -1 if dollars.startswith("-") else 1
    dollars = dollars.lstrip("-")
    return sign * (int(dollars) * 100 + int(cents))
