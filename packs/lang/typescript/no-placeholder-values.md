---
id: typescript/no-placeholder-values
title: Don't fill in '' or 0 for a missing value
applies: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"]
severity: should-fix
stage: both
source: Dan Vanderkam, Effective TypeScript, Item 36, "Use a Distinct Type for Special Values", https://effectivetypescript.com/2024/06/13/special-values/
quote: 'Choosing in-domain special values like -1, 0, or "" is similar in spirit to turning off strictNullChecks.'
added: 2026-10-20
---

When a value can be missing, say so in its type with `null` or `undefined`.
Don't stand in for it with `''`, `0` or `-1`, and don't pass `?? ''` just to
get past a parameter that won't take `undefined`. Handle the missing case, or
change the parameter's type.

**Why:** A placeholder looks like real data, so the compiler can't remind
anyone to handle the missing case. It flows on and does something: the empty
id builds the wrong URL, the made-up title gets saved.

**Flag:** `?? ''`, `?? 0` or `|| ''` on an argument whose only job is to
satisfy the parameter's type; `-1` or `''` meaning "none" in a type, a field
or a return value; made-up values like `'unknown'` written into data that is
saved or sent.

**Don't flag:** a default the domain really has (an empty filter matches
everything, no items is `[]`); a fallback shown
to the user (`name ?? 'Untitled'`); `indexOf` and other built-ins that return
`-1`, when the result is checked right away.

**Bad:**

```ts
// uid is undefined on the "new dashboard" route
const dashboard = await loadDashboard(route.uid ?? "");
```

**Good:**

```ts
// uid is undefined on the "new dashboard" route
const dashboard = route.uid ? await loadDashboard(route.uid) : newDashboard();
```
