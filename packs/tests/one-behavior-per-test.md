---
id: tests/one-behavior-per-test
title: One behavior per test, named for it
applies: tests
severity: nit
stage: diff
status: draft
source: https://abseil.io/resources/swe-book/html/ch12.html#structure_tests_to_emphasize_behaviors, Software Engineering at Google (2020), ch. 12 "Unit Testing", "Structure tests to emphasize behaviors"
quote: 'Each test should cover only a single behavior, and the vast majority of unit tests require only one "when" and one "then" block.'
added: 2026-10-19
---

Each test checks one behavior and is named for it, like "returns 404 when the
rule is missing". Don't pile several behaviors into one test named after a
function or a file.

**Why:** When a test called "rules api" fails, you have to read it to know what
broke. A test named for one behavior tells you in its name.

**Flag:** tests that check one outcome, call the code under test again, and
check another unrelated outcome; names like `TestHandler`, `test("works")` or
`test("rules api")`.

**Don't flag:** table-driven tests where each row is a named case of the same
behavior; several assertions about one result; one flow tested end to end on
purpose, such as a form that shows an error and then recovers.

**Bad:**

```ts
// A fixture resets the store with a fresh cpu rule before each test.
test("rules api", async () => {
  expect((await get("/rules/cpu")).status).toBe(200);
  expect((await get("/rules/nope")).status).toBe(404);
  expect((await del("/rules/cpu")).status).toBe(204);
});
```

**Good:**

```ts
// A fixture resets the store with a fresh cpu rule before each test.
test("returns 200 for an existing rule", async () => {
  expect((await get("/rules/cpu")).status).toBe(200);
});

test("returns 404 when the rule is missing", async () => {
  expect((await get("/rules/nope")).status).toBe(404);
});

test("returns 204 after deleting an existing rule", async () => {
  expect((await del("/rules/cpu")).status).toBe(204);
});
```
