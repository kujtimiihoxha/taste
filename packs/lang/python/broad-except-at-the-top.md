---
id: python/broad-except-at-the-top
title: Catch Exception only at the top of a loop, thread or request
applies: ["**/*.py"]
severity: should-fix
stage: diff
status: draft
source: Google Python Style Guide, 2.4 "Exceptions", https://google.github.io/styleguide/pyguide.html#24-exceptions
quote: "Never use catch-all except: statements, or catch Exception or StandardError, unless you are re-raising the exception, or creating an isolation point in the program where exceptions are not propagated but are recorded and suppressed instead, such as protecting a thread from crashing by guarding its outermost block."
added: 2026-10-19
---

Catch the exceptions the call is known to raise: the library's own error
class, `OSError`, `TimeoutError`. Catch `Exception` only at the top of a
worker loop, a thread, a task or a request, where one failure must not stop
the rest. This is the Python side of `core/errors-where-you-can-act`: even at
the layer that handles the error, name what you catch.

**Why:** `except Exception` also catches bugs: a `TypeError`, an
`AttributeError`, a `NameError` from a typo. They get the same handling as a
dropped connection, so nobody sees them. ruff's default BLE001 flags a plain
`except Exception:`, but not one whose handler logs the traceback or raises a
new error `from` the caught one, and `# noqa` silences it. Those are the cases
left to review.

**Flag:** `except Exception:` or `except BaseException:` below the top layer,
kept with `# noqa: BLE001`, `# pylint: disable=broad-except`, a
`logger.exception(...)` call or a `raise SomeError(...) from err`.

**Don't flag:** the top of a worker loop, thread, task or request handler
that logs the traceback and moves on; a broad `except` that cleans up and then
re-raises; a third-party call that is documented to raise plain `Exception`,
with a comment saying so.

**Bad:**

```python
def poll(self) -> None:
    try:
        self.reading = self.meter.read()
    except Exception:  # noqa: BLE001
        self.available = False
    else:
        self.available = True
```

**Good:**

```python
def poll(self) -> None:
    try:
        self.reading = self.meter.read()
    except MeterError:
        self.available = False
    else:
        self.available = True
```
