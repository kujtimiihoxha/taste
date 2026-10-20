---
id: python/compare-digest
title: Compare secrets with hmac.compare_digest, not ==
applies: ["**/*.py"]
severity: must-fix
stage: diff
source: Python docs, hmac, "HMAC.digest", https://docs.python.org/3/library/hmac.html#hmac.HMAC.digest
quote: "When comparing the output of digest() to an externally supplied digest during a verification routine, it is recommended to use the compare_digest() function instead of the == operator to reduce the vulnerability to timing attacks."
added: 2026-10-19
---

When you check a signature, token, API key or one-time code that came from
outside against the expected value, use `hmac.compare_digest(a, b)` or
`secrets.compare_digest(a, b)`. Compare values of the same type: bytes, or
ASCII-only strings. Validate or decode the wire format once at the input
boundary; non-ASCII strings raise `TypeError`.

**Why:** ordinary equality can reveal secret-dependent timing.
`compare_digest` avoids content-based short-circuiting; it does not promise
to hide the operands' types or lengths.

**Flag:** `==` or `!=` between a value from a request and a stored secret:
webhook signatures, API keys, session or reset tokens, one-time codes.

**Don't flag:** values that aren't secret; password checks through a hashing
library's own verify call, such as `bcrypt.checkpw`, which already compares
safely; tests.

**Bad:**

```python
def verify_webhook(body: bytes, signature: bytes) -> bool:
    expected = hmac.new(WEBHOOK_SECRET, body, hashlib.sha256).digest()
    return signature == expected
```

**Good:**

```python
def verify_webhook(body: bytes, signature: bytes) -> bool:
    expected = hmac.new(WEBHOOK_SECRET, body, hashlib.sha256).digest()
    return hmac.compare_digest(signature, expected)
```
