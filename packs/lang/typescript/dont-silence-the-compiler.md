---
id: typescript/dont-silence-the-compiler
title: Don't silence the compiler with casts
applies: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"]
severity: should-fix
stage: diff
source: Google TypeScript Style Guide, "Type and non-nullability assertions", https://google.github.io/styleguide/tsguide.html#type-and-non-nullability-assertions
quote: "Type assertions (x as SomeType) and non-nullability assertions (y!) are unsafe. Both only silence the TypeScript compiler, but do not insert any runtime checks to match these assertions, so they can cause your program to crash at runtime."
added: 2026-10-19
---

Don't make a type error go away with `as T`, `as unknown as T` or `!`. Find
out why the types disagree. Then narrow the value with a check, or fix the
type where it's wrong. typescript-eslint's recommended config already rejects
`any` and `@ts-ignore`; this rule is for what it lets through.

**Why:** A cast doesn't change the value. It only stops the compiler from
telling you about the bug, which then shows up at run time.

**Flag:** `as unknown as`; `as T` with no sound reason the value is `T`;
`{ ... } as T` on an object literal, which hides missing or misspelled fields
(write `: T` or `satisfies T`); `!` on a value that can really be missing, or
on an optional field that is always set (make it required); an eslint-disable
for `no-explicit-any`, or a `@ts-expect-error`, whose comment doesn't say why
the types are wrong.

**Don't flag:** `as const`; `satisfies`; `unknown` at a trust boundary,
followed by a check; an assertion justified by a check or invariant the compiler cannot follow;
explain the invariant when it is not obvious. Also partial fixtures, deliberate
negative type tests, and `!` in a test right after asserting the value exists.

**Bad:**

```ts
// CartItem has unitPrice and quantity, no price
function total(items: CartItem[]) {
  const priced = items as unknown as { price: number }[];
  return priced.reduce((sum, i) => sum + i.price, 0);
}
```

**Good:**

```ts
// CartItem has unitPrice and quantity, no price
function total(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}
```
