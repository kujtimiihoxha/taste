---
id: typescript/discriminated-unions
title: Model states as a union, not optional fields and flags
applies: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"]
severity: should-fix
stage: both
source: TypeScript Handbook, "Narrowing", Discriminated unions, https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
quote: "The problem with this encoding of Shape is that the type-checker doesn't have any way to know whether or not radius or sideLength are present based on the kind property."
added: 2026-10-19
---

When a value can be in one of a few states, write one type per state and join
them with a `status` (or `kind`) field. Don't use one type with optional
fields and booleans that only make sense together.

**Why:** With flags, the type allows states that can't happen (loading and
failed at once), and every reader has to check for them. With a union, a check
on `status` tells the compiler which fields are there, so the bad states can't
be built and those checks go away.

**Flag:** two or more booleans that can't both be true; optional fields that
are only set in one state; `data?`, `error?` and `isLoading` on one type.

**Don't flag:** options that really are independent (`isPinned` and
`isMuted`); types that mirror an external API you don't control.

**Bad:**

```ts
type Request = {
  isLoading: boolean;
  data?: Report;
  error?: string;
};
```

**Good:**

```ts
type Request =
  { status: "loading" } | { status: "done"; data: Report } | { status: "failed"; error: string };
```
