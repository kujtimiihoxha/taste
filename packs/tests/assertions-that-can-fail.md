---
id: tests/assertions-that-can-fail
title: Every test needs an assertion that can fail
applies: tests
severity: should-fix
stage: diff
source: https://google.github.io/eng-practices/review/reviewer/looking-for.html#tests, Google Engineering Practices, "What to look for in a code review", "Tests"
quote: "Tests do not test themselves, and we rarely write tests for our tests—a human must ensure that tests are valid. Will the tests actually fail when the code is broken?"
added: 2026-10-19
---

A test should fail for the incorrect behavior it is meant to catch. Check the
part of the result that distinguishes that behavior from a plausible mistake,
and make sure the check runs. Choose inputs that expose that mistake: a
sorting test needs unordered values to catch an implementation that returns
its input unchanged.

**Why:** A test that can't fail is worse than no test. It looks like coverage, so
nobody writes the real one.

**Flag:** a check that would also pass for a concrete incorrect result (name
it); a test with no effective check; asserting that a mock returned what it was
told to return; checks skipped by the test's control flow or a callback it
doesn't wait for, where tools don't already report the problem; "not in the log"
checks that a typo in the message would also pass; inputs that cannot expose
the mistake the test claims to catch, such as a filtering test containing
only matching records. Name the broken implementation that would pass.

**Don't flag:** existence, a boolean, success or lack of an exception when that
is the behavior under test; a check made by a helper or framework, including
an expected-failure check; a required side-effect call; a case that checks
already-valid input is preserved, or one case in a suite that covers the
distinguishing inputs elsewhere. Leave missing-expect
and syntactically unreachable-code diagnostics to the configured tools that
already report them.

**Bad:**

```ts
test("sorts rule names", () => {
  expect(sortRuleNames(["cpu", "memory"])).toEqual(["cpu", "memory"]);
});
```

**Good:**

```ts
test("sorts rule names", () => {
  expect(sortRuleNames(["memory", "cpu"])).toEqual(["cpu", "memory"]);
});
```
