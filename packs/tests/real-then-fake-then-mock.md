---
id: tests/real-then-fake-then-mock
title: Use the real code, then a fake, and a mock last
applies: tests
severity: should-fix
stage: both
status: draft
source: https://abseil.io/resources/swe-book/html/ch13.html#how_to_decide_when_to_use_a_real_implem, Software Engineering at Google (2020), ch. 13 "Test Doubles", "How to Decide When to Use a Real Implementation"
quote: "A real implementation is preferred if it is fast, deterministic, and has simple dependencies."
added: 2026-10-19
---

Use the real code when it is fast, deterministic and easy to build. When it
isn't, because it talks to the network, a disk or the clock, use a fake: a
small working version, like an in-memory store. Use a mock only when neither
works. Don't mock your own fast code just to test a unit alone.

**Why:** A mock of your own code tests the mock. The test passes when the real
code is broken, and breaks when the real code is refactored.

**Flag:** `jest.mock`, `vi.mock` or `patch` of the repo's own pure modules and
functions; generated mocks (gomock, mockery) of the repo's own interfaces when
the real type is cheap to build; mocks of value types such as enums, dates and
simple structs; interfaces added only so a test can mock them.

**Don't flag:** doubles for things that are slow or outside the process
(network, disk, clock, randomness, third-party services), a fake the owner of a
dependency provides, or a shared fake of a slow real dependency such as a
database.

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
