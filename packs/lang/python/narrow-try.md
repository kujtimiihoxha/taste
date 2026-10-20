---
id: python/narrow-try
title: Keep the try block to the line that can fail
applies: ["**/*.py"]
severity: should-fix
stage: diff
status: draft
source: PEP 8, "Programming Recommendations", https://peps.python.org/pep-0008/#programming-recommendations
quote: "Additionally, for all try/except clauses, limit the try clause to the absolute minimum amount of code necessary."
added: 2026-10-19
---

Put only the call that can raise the caught exception inside `try`. The code
that runs when that call works goes after the `try` statement, or in its
`else:` block.

**Why:** In Python, ordinary code raises `KeyError`, `ValueError`,
`TypeError` and `OSError` all the time. A wide `try` catches the same
exception from a line you didn't mean to guard, and the handler reports a bug
as the failure it was written for.

**Flag:** `try` blocks that hold the risky call plus the work after it
(parsing, building results, saving, returning); a handler written for one
line's error, such as a `KeyError` from a lookup, around other lines that can
raise it too.

**Don't flag:** `try`/`finally` blocks, which must cover all the work they
clean up after; several lines that can all raise the caught error and need the
same handling; the outer `try` of a worker loop that catches failures on
purpose.

**Bad:**

```python
def order_total(order: Order, currency: str) -> Decimal:
    try:
        rate = RATES[currency]
        return convert(order.items, rate)
    except KeyError:
        raise UnsupportedCurrency(currency) from None
```

**Good:**

```python
def order_total(order: Order, currency: str) -> Decimal:
    try:
        rate = RATES[currency]
    except KeyError:
        raise UnsupportedCurrency(currency) from None
    return convert(order.items, rate)
```
