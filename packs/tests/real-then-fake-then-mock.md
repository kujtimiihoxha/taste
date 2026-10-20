---
id: tests/real-then-fake-then-mock
title: Use the real code, then a fake, and a mock last
applies: tests
severity: should-fix
stage: both
source: https://abseil.io/resources/swe-book/html/ch13.html#how_to_decide_when_to_use_a_real_implem, Software Engineering at Google (2020), ch. 13 "Test Doubles", "How to Decide When to Use a Real Implementation"
quote: "A real implementation is preferred if it is fast, deterministic, and has simple dependencies."
added: 2026-10-19
---

Prefer the real code when it is practical for the behavior and scope of this
test. When a double is needed, prefer a maintained fake that implements the
relevant contract. A focused stub or mock is appropriate for a valid outcome
that is hard to trigger or when a faithful fake would be impractical. Don't
mock your own fast code just to test a unit alone.

**Why:** Excessive mocking can miss integration mistakes and tie a test to
implementation details, so a correct refactor breaks the test.

**Flag:** `jest.mock`, `vi.mock` or `patch` of the repo's own pure modules and
functions; generated mocks (gomock, mockery) of the repo's own interfaces when
the real type is cheap to build; mocks of value types such as enums, dates and
simple structs; interfaces around otherwise easy-to-test code added only to
configure expectations on its implementation details.

**Don't flag:** doubles for things that are slow or outside the process
(network, disk, clock, randomness, third-party services), a fake the owner of a
dependency provides, or a shared fake of a slow real dependency such as a
database; a focused double for a valid outcome that is hard to trigger, or
when a maintained fake is unavailable or unsuitable; deliberate integration
or end-to-end tests of real first-party components.

**Bad:**

```ts
jest.mock("./format", () => ({ formatRule: jest.fn(() => "cpu (off)") }));

test("lists disabled rules", () => {
  expect(listLabels([{ name: "cpu", enabled: false }])).toEqual(["cpu (off)"]);
});
```

**Good:**

```ts
test("lists disabled rules", () => {
  expect(listLabels([{ name: "cpu", enabled: false }])).toEqual(["cpu (off)"]);
});
```
