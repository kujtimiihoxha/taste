---
id: python/is-none-not-falsy
title: Test for None with is None when 0 or empty is a valid value
applies: ["**/*.py"]
severity: should-fix
stage: diff
source: PEP 8, "Programming Recommendations", https://peps.python.org/pep-0008/#programming-recommendations
quote: "Also, beware of writing if x when you really mean if x is not None – e.g. when testing whether a variable or argument that defaults to None was set to some other value. The other value might have a type (such as a container) that could be false in a boolean context!"
added: 2026-10-19
---

When a value can be `None` and can also be `0`, `""`, `False` or an empty
list or dict, test for "missing" with `is None`. `if not x` and
`x or default` treat those valid values as missing too.

**Why:** The bug only shows with the falsy value: a timeout of 0 becomes the
default, an empty filter list is swapped for the default filters, PIN 0000 is
rejected. Tests with typical values pass, so it ships.

**Flag:** `x or default`, `if not x` or `if x` on an optional number,
string, list or dict where 0 or empty means something; `assert x` on such a
value.

**Don't flag:** values that are never falsy, like most objects, clients and
dataclass instances, where `if x:` is fine; cases where empty and `None` mean
the same thing, like `if not items: return`; strings where empty isn't a valid
value anyway.

**Bad:**

```python
def fetch(url: str, timeout: float | None = None) -> bytes:
    timeout = timeout or DEFAULT_TIMEOUT
    return http_get(url, timeout=timeout)
```

**Good:**

```python
def fetch(url: str, timeout: float | None = None) -> bytes:
    if timeout is None:
        timeout = DEFAULT_TIMEOUT
    return http_get(url, timeout=timeout)
```
