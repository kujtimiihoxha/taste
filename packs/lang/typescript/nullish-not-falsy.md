---
id: typescript/nullish-not-falsy
title: Use ?? when 0 or an empty string is a real value
applies: ["**/*.ts", "**/*.tsx"]
severity: should-fix
stage: diff
status: draft
source: TypeScript 3.7 release notes, "Nullish Coalescing", https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#nullish-coalescing
quote: 'When localStorage.volume is set to 0, the page will set the volume to 0.5 which is unintended. ?? avoids some unintended behavior from 0, NaN and "" being treated as falsy values.'
added: 2026-10-20
---

To give a missing value a default, use `??`. To check whether it's there, use
`=== undefined` or `== null`. `||` and `if (!x)` also treat `0`, `''`, `false`
and `NaN` as missing, so use them only when every falsy value should count as
missing.

**Why:** `width || 10` turns a real width of 0 into 10, and `if (!index)`
skips index 0. The code looks right and is wrong only for the values nobody
tests.

**Flag:** `||` defaults and `if (!x)` "is it missing" checks on numbers,
strings or booleans where `0`, `''` or `false` is a valid value: counts,
indexes, sizes, timeouts, user input, flags that default to `true`.

**Don't flag:** values whose type has no falsy members besides `null` and
`undefined` (objects, arrays, functions); strings where `''` really means "not
set", such as an empty form field; `s || ''` on a string or `b || false` on
a boolean, which give the same result as `??`; `if (items.length)`.

**Bad:**

```ts
// A timeout of 0 means "no timeout".
const timeout = options.timeout || 30_000;
```

**Good:**

```ts
// A timeout of 0 means "no timeout".
const timeout = options.timeout ?? 30_000;
```
