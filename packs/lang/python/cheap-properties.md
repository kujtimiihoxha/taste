---
id: python/cheap-properties
title: Keep properties cheap; do I/O in a method
applies: ["**/*.py"]
severity: should-fix
stage: diff
status: draft
source: Google Python Style Guide, 2.13 "Properties", https://google.github.io/styleguide/pyguide.html#213-properties
quote: "Property implementations must match the general expectations of regular attribute access: that they are cheap, straightforward, and unsurprising."
added: 2026-10-19
---

A property returns something the object already has, or works it out
quickly from that. Network calls, database queries, file reads and slow
computations go in a method the caller calls on purpose, or in an update step
that stores the result for the property to read.

**Why:** `device.temperature` looks like reading a field, so callers read it
in loops, in log lines and in `__repr__`. Each read then repeats the slow
call, and it can block or raise where nobody expects it.

**Flag:** properties that make HTTP, database or file calls, or call a
client method that does; properties that redo a costly computation on every
read.

**Don't flag:** properties that read or combine attributes;
`functools.cached_property` for a value that is costly once and then fixed;
lazy attributes a framework provides and documents, like an ORM relationship.

**Bad:**

```python
class Thermostat:
    @property
    def temperature(self) -> float:
        return self._api.get_state(self.device_id)["temperature"]
```

**Good:**

```python
class Thermostat:
    def fetch_temperature(self) -> float:
        return self._api.get_state(self.device_id)["temperature"]
```
