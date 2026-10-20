---
id: tests/assertions-that-can-fail
title: Every test needs an assertion that can fail
applies: tests
severity: should-fix
stage: diff
status: draft
source: https://google.github.io/eng-practices/review/reviewer/looking-for.html#tests, Google Engineering Practices, "What to look for in a code review", "Tests"
quote: "Tests do not test themselves, and we rarely write tests for our tests—a human must ensure that tests are valid. Will the tests actually fail when the code is broken?"
added: 2026-10-19
---

Every test must check something that would fail if the code under test were
broken. Assert the actual value, and make sure the assertion runs. A test that
only checks "not nil", "defined", "no error" or "was called" passes for almost
any output.

**Why:** A test that can't fail is worse than no test. It looks like coverage, so
nobody writes the real one.

**Flag:** tests whose only checks are NotNil, `toBeDefined`, `toBeTruthy`,
`err == nil`, "doesn't throw" or a bare "was called"; tests with no assertions;
asserting that a mock returned what it was told to return; assertions that never
run, such as after the call that raises inside a `raises` block, after an early
`return`, or in a callback the test doesn't wait for; "not in the log" checks
that a typo in the message would also pass.

**Don't flag:** a not-nil check that guards real assertions on the value right
after it, or "no error" when succeeding is the behavior and other tests check
the output.

**Bad:**

```ts
test("formats a disabled rule as off", () => {
  const label = formatRule({ name: "cpu", enabled: false });
  expect(label).toBeDefined();
});
```

**Good:**

```ts
test("formats a disabled rule as off", () => {
  const label = formatRule({ name: "cpu", enabled: false });
  expect(label).toBe("cpu (off)");
});
```
