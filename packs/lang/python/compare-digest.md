---
id: python/compare-digest
title: Compare secrets with hmac.compare_digest, not ==
applies: ["**/*.py"]
severity: must-fix
stage: diff
status: draft
source: Python docs, hmac, "HMAC.digest", https://docs.python.org/3/library/hmac.html#hmac.HMAC.digest
quote: "When comparing the output of digest() to an externally supplied digest during a verification routine, it is recommended to use the compare_digest() function instead of the == operator to reduce the vulnerability to timing attacks."
added: 2026-10-19
---

When you check a signature, token, API key or one-time code that came from
outside against the expected value, use `hmac.compare_digest(a, b)` or
`secrets.compare_digest(a, b)`.

**Why:** `==` stops at the first character that differs, so the time it
takes shows how much of a guess was right. An attacker can guess the expected
value a character at a time. `compare_digest` takes the same time however
much of the input matches.

**Flag:** `==` or `!=` between a value from a request and a stored secret:
webhook signatures, API keys, session or reset tokens, one-time codes.

**Don't flag:** values that aren't secret; password checks through a hashing
library's own verify call, such as `bcrypt.checkpw`, which already compares
safely; tests.

**Bad:**

```python
def verify_webhook(body: bytes, signature: str) -> bool:
    expected = hmac.new(WEBHOOK_SECRET, body, hashlib.sha256).hexdigest()
    return signature == expected
```

**Good:**

```python
def verify_webhook(body: bytes, signature: str) -> bool:
    expected = hmac.new(WEBHOOK_SECRET, body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(signature, expected)
```
