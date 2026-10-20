---
id: typescript/handle-every-promise
title: Await or handle every promise
applies: ["**/*.ts", "**/*.tsx"]
severity: must-fix
stage: diff
status: draft
source: typescript-eslint, "no-floating-promises", https://typescript-eslint.io/rules/no-floating-promises/
quote: "Floating Promises can cause several issues, such as improperly sequenced operations, ignored Promise rejections, and more."
added: 2026-10-20
---

Every promise is awaited, returned, or given a `.catch`. If you start one on
purpose and don't wait for it, make sure it handles its own errors; `void`
marks it as on purpose. Don't pass an async function to `forEach`: nothing
waits for it. typescript-eslint's type-checked configs flag this as
`no-floating-promises`, but its default config doesn't.

**Why:** A promise nobody waits for runs out of order and fails in silence.
The next line reads data that isn't saved yet, and a rejection nobody catches
is lost, or crashes the Node process. It's the async way to hide a failure
(`core/dont-hide-failures`).

**Flag:** a call that returns a promise, used as a statement with no `await`,
`return`, `.catch` or `void`, when code after it needs it done or nothing
handles its rejection; `forEach(async ...)`, or an `async` callback passed to
any API that ignores what the callback returns.

**Don't flag:** a call that catches its own errors and that nothing after it
depends on, with or without `void` (a missing `void` there is style, not a
bug); `main().catch(...)` at the top of a script.

**Bad:**

```ts
async function saveAll(rules: Rule[]) {
  rules.forEach(async (rule) => {
    await api.put(`/rules/${rule.id}`, rule);
  });
}
```

**Good:**

```ts
async function saveAll(rules: Rule[]) {
  await Promise.all(rules.map((rule) => api.put(`/rules/${rule.id}`, rule)));
}
```
