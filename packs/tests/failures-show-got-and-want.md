---
id: tests/failures-show-got-and-want
title: A failing test says what it got and what it wanted
applies: tests
severity: nit
stage: diff
source: https://abseil.io/resources/swe-book/html/ch12.html#write_clear_failure_messages, Software Engineering at Google (2020), ch. 12 "Unit Testing", "Write Clear Failure Messages"
quote: "A good failure message contains much the same information as the test’s name: it should clearly express the desired outcome, the actual outcome, and any relevant parameters."
added: 2026-10-20
---

When a test fails, its output should show what it got, what it wanted and for
which input. Use the assertion that compares values (equal, contains, a diff),
not one that only sees true or false. When you write the message yourself, put
in the got value, the want value and the input.

**Why:** A failure that says "expected true, got false" sends someone back to
rerun the test with prints. A clear one lets them start from the CI log.

**Flag:** boolean checks where a comparing assertion exists, like
`assertTrue(a == b)`, `expect(xs.includes(x)).toBe(true)` or
`assert.True(t, len(xs) == 3)`; hand-written messages that leave out the got
value, the want value or the input; failed deep comparisons that print neither
the values nor a diff.

**Don't flag:** frameworks that already print both sides, like pytest's plain
`assert a == b`; a boolean that is itself the result under test, like
`isValid(x)` with `x` in the test's name; table cases whose name already shows
the input.

**Bad:**

```ts
test("lists disabled rules as off", () => {
  const labels = listLabels([{ name: "cpu", enabled: false }]);
  expect(labels.includes("cpu (off)")).toBe(true);
});
```

**Good:**

```ts
test("lists disabled rules as off", () => {
  const labels = listLabels([{ name: "cpu", enabled: false }]);
  expect(labels).toContain("cpu (off)");
});
```
