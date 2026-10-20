---
id: typescript/trust-the-types
title: Don't re-check what the type already guarantees
applies: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"]
severity: should-fix
stage: diff
status: draft
source: typescript-eslint, "no-unnecessary-condition", https://typescript-eslint.io/rules/no-unnecessary-condition/
quote: "Conversely, any expression that always evaluates to truthy or always evaluates to falsy, as determined by the type of the expression, is considered unnecessary and will be flagged by this rule."
added: 2026-10-19
---

This is `core/new-check-needs-a-real-input` in TypeScript. In strict mode (the
default since TypeScript 6.0) the type says whether a value can be `null` or
`undefined`. If it can't, a nullish guard with `?.` or `??` adds nothing. Remove
truthiness or `typeof` checks only when the type or an earlier check already
proves their result: a non-null string, number or boolean can still be falsy.

**Why:** A check for an impossible case makes the reader wonder when it
happens. The answer is never, so the code got harder to read for nothing. If
the value really can be missing, fix the type or the edge instead.

**Flag:** `?.` or `??` on a value whose type has no `null` or `undefined`;
`typeof x === 'string'` when `x: string`; `|| []` on a typed array; a second
check on a value an earlier `if` already narrowed.

**Don't flag:** checks on `unknown` data at a trust boundary; fields that
really are optional; an exhaustive `switch` that ends in a `never` check;
array and record lookups (`items[i]`, `byId[key]`), which TypeScript types as
always there unless `noUncheckedIndexedAccess` is on.

**Bad:**

```ts
// type User = { id: string; name: string }
function label(user: User): string {
  if (!user || typeof user.name !== "string") {
    return "";
  }
  return user?.name?.trim() ?? "";
}
```

**Good:**

```ts
// type User = { id: string; name: string }
function label(user: User): string {
  return user.name.trim();
}
```
