---
id: typescript/handle-every-promise
title: Await or handle every promise
applies: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"]
severity: must-fix
stage: diff
source: typescript-eslint, "no-floating-promises", https://typescript-eslint.io/rules/no-floating-promises/
quote: "Floating Promises can cause several issues, such as improperly sequenced operations, ignored Promise rejections, and more."
added: 2026-10-20
---

Wait for a promise when later work needs it finished, and make sure its
rejection has an owner: the caller, `await`, `.catch`, or a rejection handler
passed to `.then`. `void` marks intentional background work but does not
handle errors or make dependent work wait. `forEach` does not wait for async
callbacks. typescript-eslint's type-checked configs flag this as
`no-floating-promises`, but its default config doesn't.

**Why:** A promise nobody waits for runs out of order and fails in silence.
The next line reads data that isn't saved yet, and a rejection nobody catches
is lost, or crashes the Node process. It's the async way to hide a failure
(`core/dont-hide-failures`).

**Flag:** a promise, including one prefixed with `void`, whose rejection has
no owner or whose required completion is not awaited; an async callback
passed to `forEach` or another API that ignores its return, when this loses
error handling or completion that the caller needs.

**Don't flag:** a call or async callback that catches its own errors and that
nothing after it depends on, with or without `void` (a missing `void` there is style, not a
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
