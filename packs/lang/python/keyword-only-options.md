---
id: python/keyword-only-options
title: Make flags and options keyword-only
applies: ["**/*.py"]
severity: nit
stage: diff
source: Python Tutorial, 4.9.3.5 "Recap", https://docs.python.org/3/tutorial/controlflow.html#recap
quote: "Use keyword-only when names have meaning and the function definition is more understandable by being explicit with names or you want to prevent users relying on the position of the argument being passed."
added: 2026-10-19
---

In a new or changed function, put `*` before the parameters that switch or
tune behavior: booleans, modes, limits, timeouts. Callers then have to name
them. Leave the one or two main inputs positional.

**Why:** At the call site, a bare `True` or `None` says nothing, and two
flags are easy to pass in the wrong order. `save(path, data, True)` could mean
overwrite, append or anything else. Keyword-only parameters can also be
reordered or added later without breaking callers.

**Flag:** new public functions and methods whose boolean or option
parameters can be passed by position; new calls that pass bare `True`,
`False` or `None` by position.

**Don't flag:** main inputs that read clearly by position, like
`copy(src, dst)`; signatures fixed by a framework, a protocol or a dunder
method; adding `*` to an already released function, which breaks callers that
pass by position, unless the change plans a deprecation step.

**Bad:**

```python
def save(path: Path, data: bytes, overwrite: bool = False) -> None:
    ...

save(path, data, True)
```

**Good:**

```python
def save(path: Path, data: bytes, *, overwrite: bool = False) -> None:
    ...

save(path, data, overwrite=True)
```
