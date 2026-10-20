---
id: typescript/simplest-type
title: Write the simplest type that says it
applies: ["**/*.ts", "**/*.tsx"]
severity: should-fix
stage: diff
status: draft
source: Google TypeScript Style Guide, "Mapped and conditional types", https://google.github.io/styleguide/tsguide.html#mapped-conditional-types
quote: "Always use the simplest type construct that can possibly express your code. A little bit of repetition or verbosity is often much cheaper than the long term cost of complex type expressions."
added: 2026-10-20
---

Write types as plain interfaces and unions. Use conditional, mapped or
template-literal types, or a stack of `Pick`, `Omit` and `&`, only when a
plain type can't say the same thing. Spelling out a few fields is fine.

**Why:** A reader has to work out a type expression in their head before they
know what the type is, and editors can't find or rename the fields it makes. A
plain interface reads at a glance.

**Flag:** a mapped, conditional or template-literal type that a short
interface or union could replace; `Pick`, `Omit` and `&` stacked to build a
type with a handful of fields; a generic type helper with one use (the type
form of `core/no-single-use-abstraction`); an intersection that adds a field
the type already has.

**Don't flag:** standard helpers used plainly (`Partial<Props>`,
`Record<Id, Rule>`, `ReturnType<typeof load>`); a type derived from a
library's or generated type so the two stay in sync
(`ComponentProps<typeof Button>`, `z.infer<typeof schema>`); a library's
public types, where the precision helps every caller and the types have
tests.

**Bad:**

```ts
type Flags<T extends string> = { [K in T as `show${Capitalize<K>}`]: boolean };
type PanelFlags = Flags<"legend" | "tooltip">;
```

**Good:**

```ts
interface PanelFlags {
  showLegend: boolean;
  showTooltip: boolean;
}
```
