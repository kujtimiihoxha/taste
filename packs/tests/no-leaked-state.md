---
id: tests/no-leaked-state
title: Each test cleans up what it changes
applies: tests
severity: should-fix
stage: diff
status: draft
source: https://martinfowler.com/articles/nonDeterminism.html#LackOfIsolation, Martin Fowler, "Eradicating Non-Determinism in Tests" (2011), "Lack of Isolation"
quote: "Keep your tests isolated from each other, so that execution of one test will not affect any others."
added: 2026-10-20
---

A test must pass alone, in any order and next to other tests. Put back anything
shared that it changes: package variables, environment variables, feature
flags, singletons, the working directory. Register the undo so it runs even when
the test fails. Use resources of its own: a temp directory, unique names, a port
the OS picks.

**Why:** A test that leaves state behind breaks other tests, depending on the
order they run in. The failure shows up far from its cause and looks like a
flake.

**Flag:** writes to globals, `os.environ`, `process.env`, flags or singletons
with no undo; an undo written as a plain last line, which a failing assertion
skips, instead of `defer`, `t.Cleanup`, `afterEach` or a fixture; fixed file
paths, ports or object names that other tests also use; tests that need another
test to run first.

**Don't flag:** changes the framework undoes (`t.Setenv`, `t.TempDir`, pytest's
`monkeypatch` and `tmp_path`); state that a setup hook resets before every
test; read-only shared fixtures; an expensive shared resource that each test
leaves as it found it.

**Bad:**

```python
def test_retry_gives_up_after_three_tries():
    retry.DEFAULT_BACKOFF = 0
    with pytest.raises(GaveUp):
        retry.call(always_fails)
    retry.DEFAULT_BACKOFF = 1.0
```

**Good:**

```python
def test_retry_gives_up_after_three_tries(monkeypatch):
    monkeypatch.setattr(retry, "DEFAULT_BACKOFF", 0)
    with pytest.raises(GaveUp):
        retry.call(always_fails)
```
