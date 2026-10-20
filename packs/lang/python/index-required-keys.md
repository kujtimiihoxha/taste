---
id: python/index-required-keys
title: Index keys that must be there; use .get() only for optional ones
applies: ["**/*.py"]
severity: should-fix
stage: diff
source: Python docs, Built-in Types, "dict.get", https://docs.python.org/3/library/stdtypes.html#dict.get
quote: "If default is not given, it defaults to None, so that this method never raises a KeyError."
added: 2026-10-19
---

When a key has to be in a dict, because a schema, your own code or an API
contract puts it there, read it with `d[key]`. Use `.get()` only for keys
that may really be missing, with the default the missing case needs. This is
the Python form of the "just in case" defaults in
`core/new-check-needs-a-real-input`.

**Why:** `.get()` never raises. A missing key becomes `None`, and the error
shows up lines later as `'NoneType' object has no attribute ...`, or as a
wrong value that gets saved. `d[key]` fails with a `KeyError` that names the
key, on the line where things went wrong.

**Flag:** `.get(key)` or `.get(key, default)` on keys the code just validated
or built; chains like `data.get("a", {}).get("b", [])` on data with a known
shape; a `.get()` result used as if it can't be `None`; a second default that
repeats the one the schema already sets.

**Don't flag:** keys that are optional by design; outside data where a
missing key is a normal input to handle; caches and counters, where a missing
key means "not yet".

**Bad:**

```python
# The config schema requires "host" and gives "port" a default.
def connect(config: dict) -> Client:
    host = config.get("host")
    port = config.get("port", 8080)
    return Client(host, port)
```

**Good:**

```python
# The config schema requires "host" and gives "port" a default.
def connect(config: dict) -> Client:
    host = config["host"]
    port = config["port"]
    return Client(host, port)
```
