---
id: python/dont-silence-the-type-checker
title: Don't silence the type checker with Any
applies: ["**/*.py"]
severity: should-fix
stage: diff
source: Python docs, typing, "The Any type", https://docs.python.org/3/library/typing.html#the-any-type
quote: "Use object to indicate that a value could be any type in a typesafe manner. Use Any to indicate that a value is dynamically typed."
added: 2026-10-19
---

Write the real type where you know it, even when `Any` would make a type
error go away. Use `object` for a value you only pass along, and keep `Any`
for values that really are dynamic.

**Why:** `Any` turns checking off for that value and for everything that
comes from it. The error the checker found is still there; it now shows up at
run time. `object` accepts any value but still stops you from calling methods
it might not have.

**Flag:** `Any` on a parameter, return value or attribute whose type is
known; `Any` where `object` would do, for a value the code only passes along.

**Don't flag:** `*args: Any, **kwargs: Any` passed straight through to
another function; values from untyped third-party code at the edge, before
they are checked.

**Bad:**

```python
def apply_discount(order: Any, percent: float) -> Any:
    order.total = order.total * (1 - percent / 100)
    return order
```

**Good:**

```python
def apply_discount(order: Order, percent: float) -> Order:
    order.total = order.total * (1 - percent / 100)
    return order
```
