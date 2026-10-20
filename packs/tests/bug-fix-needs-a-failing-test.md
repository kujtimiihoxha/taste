---
id: tests/bug-fix-needs-a-failing-test
title: A bug fix comes with a test that fails without it
applies: ["**/*"]
severity: should-fix
stage: both
status: draft
source: https://abseil.io/resources/swe-book/html/ch12.html#strive_for_unchanging_tests, Software Engineering at Google (2020), ch. 12 "Unit Testing", "Strive for Unchanging Tests"
quote: "Fixing a bug is much like adding a new feature: the presence of the bug suggests that a case was missing from the initial test suite, and the bug fix should include that missing test case."
added: 2026-10-20
---

A change that fixes a bug adds the test case that was missing: one that fails on
the old code, for the reason the bug report gives, and passes with the fix. Run
it once without the fix to see it fail.

**Why:** A fix without its test can come back with the next refactor. A test
that passes with or without the fix only looks like one.

**Flag:** a fix with no new or changed test; a new test that would also pass on
the old code, or that covers a nearby case instead of the reported one; a plan
that fixes a bug with no step for its test.

**Don't flag:** a fix where a test isn't practical and the change says why, such
as a race seen only in production or code with no tests to add one to; a bug an existing test already caught, now
passing; fixes to docs, build files or dependency versions.

**Bad:**

```python
# Fix #812: total() crashed on an empty cart.
def test_total_of_two_items():
    assert total([Item(price=2), Item(price=3)]) == 5
```

**Good:**

```python
# Fix #812: total() crashed on an empty cart.
def test_total_of_empty_cart_is_zero():
    assert total([]) == 0
```
