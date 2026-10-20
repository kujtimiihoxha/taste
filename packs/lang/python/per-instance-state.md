---
id: python/per-instance-state
title: Create per-instance state in __init__, not in the class body
applies: ["**/*.py"]
severity: should-fix
stage: diff
source: Python Tutorial, 9.3.5 "Class and Instance Variables", https://docs.python.org/3/tutorial/classes.html#class-and-instance-variables
quote: "the tricks list in the following code should not be used as a class variable because just a single list would be shared by all Dog instances"
added: 2026-10-19
---

An object created in the class body exists once, and every instance shares
it. Create the locks, clients, counters and caches that an instance changes in
`__init__`, or with `field(default_factory=...)` in a dataclass. Keep the
class body for constants, and mark state you mean to share with `ClassVar`.

**Why:** Shared state leaks between instances. One worker's counts show up
in another's, and a lock meant for one connection serializes all of them.
ruff's default RUF012 flags list, dict and set values in a class body. It
can't see other objects, like a `Stats()` or a `threading.Lock()`.

**Flag:** class attributes holding a lock, client, session or other mutable
object that instance methods change, on a class with more than one instance.

**Don't flag:** state that is meant to be shared and is marked `ClassVar` or
explained in a comment, such as a class-wide lock around a class-wide cache;
constants; registries filled once at import time, for example by decorators.

**Bad:**

```python
class Worker:
    stats = Stats()

    def handle(self, job: Job) -> None:
        self.stats.processed += 1
```

**Good:**

```python
class Worker:
    def __init__(self) -> None:
        self.stats = Stats()

    def handle(self, job: Job) -> None:
        self.stats.processed += 1
```
