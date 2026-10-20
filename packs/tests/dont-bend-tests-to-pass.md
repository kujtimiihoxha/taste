---
id: tests/dont-bend-tests-to-pass
title: Don't change old tests to make a change pass
applies: tests
severity: should-fix
stage: both
status: draft
source: https://abseil.io/resources/swe-book/html/ch12.html#strive_for_unchanging_tests, Software Engineering at Google (2020), ch. 12 "Unit Testing", "Strive for Unchanging Tests"
quote: "The takeaway is that after you write a test, you shouldn’t need to touch that test again as you refactor the system, fix bugs, or add new features."
added: 2026-10-20
---

In a refactor, a bug fix or a new feature, the old tests should pass as they
are. Don't edit an old test's expected values, delete its cases or assertions,
loosen its checks or skip it to get the change to pass. If an old test fails,
the change broke what it guards, or the change is a behavior change: then the
change says which behavior changes and why.

**Why:** An old test that fails is doing its job. Editing it to match the new
output turns a caught regression into a passing build.

**Flag:** in a change that says it keeps behavior: edited expected values,
removed cases or assertions, looser checks (an exact match turned into
"contains", a value check turned into not-nil), new skips, deleted test files;
an old case rewritten to cover a new option instead of a new case next to it; a
plan step that says to update old tests to the new output.

**Don't flag:** a behavior change the task asks for, named in the change; setup
that has to change for a new constructor argument or a renamed API while the
checks stay the same; a test that was wrong, with the reason; tests for code the
change deletes; an old test tied to internals (private fields, call order)
rewritten to check the same behavior through the public API, with checks no
weaker.

**Bad:**

```python
# PR: "Move price rounding into money.py. No behavior change."
def test_total_rounds_half_up():
    assert order_total([Item(price=Decimal("1.005"))]) == Decimal("1.00")  # was 1.01
```

**Good:**

```python
# PR: "Move price rounding into money.py. No behavior change."
def test_total_rounds_half_up():
    assert order_total([Item(price=Decimal("1.005"))]) == Decimal("1.01")
```
