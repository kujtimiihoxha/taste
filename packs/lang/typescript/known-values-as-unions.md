---
id: typescript/known-values-as-unions
title: Type a known set of values as a union, not string
applies: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"]
severity: should-fix
stage: diff
status: draft
source: TypeScript Handbook, "Everyday Types", Literal Types, https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types
quote: "But by combining literals into unions, you can express a much more useful concept - for example, functions that only accept a certain set of known values"
added: 2026-10-20
---

When a field, parameter or return value is one of a set of strings the code
already knows, type it as a union of those literals (`"gt" | "lt"`), or use
the union or enum the repo already has for it. Don't type it as plain
`string`.

**Why:** A typo in a plain `string` compiles, and fails at run time or never.
With a union, the compiler catches it and editors offer the values.

**Flag:** `string` on a `type`, `kind`, `status` or `mode` field whose values
are listed in a comment, a `switch` or the docs; a return type of `string`
for values from a known set, such as icon names; a schema field like
`z.string()` for one of a known list, where `z.enum([...])` fits.

**Don't flag:** values another system owns and can add to, such as codes a
backend sends that the frontend doesn't release with (keep `string`); free
text, IDs and names.

**Bad:**

```ts
interface Condition {
  evaluator: string; // "gt", "lt" or "within_range"
  threshold: number;
}
```

**Good:**

```ts
interface Condition {
  evaluator: "gt" | "lt" | "within_range";
  threshold: number;
}
```
