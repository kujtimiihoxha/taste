---
id: typescript/no-return-only-generics
title: Don't add a type parameter that only sets the return type
applies: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"]
severity: should-fix
stage: diff
status: draft
source: Google TypeScript Style Guide, "Return type only generics", https://google.github.io/styleguide/tsguide.html#return-type-only-generics
quote: "Avoid creating APIs that have return type only generics. When working with existing APIs that have return type only generics always explicitly specify the generics."
added: 2026-10-20
---

A type parameter should link two things, such as an argument and the result.
When unchecked data is returned as a type parameter that appears only in the
result, like `load<T>(key: string): T`, each caller picks a type that the
implementation has not established. Return
`unknown` and let the caller check the value, or take the parser or schema as
an argument so `T` comes from it.

**Why:** The signature promises a typed result it can't deliver. It reads as
safe, so callers skip the check they would write for `unknown`.

**Flag:** new functions or methods that claim unchecked data is a caller-chosen
return type, including inside `Promise<T>` or `T[]`, without relating that
type to an input or checking the data.

**Don't flag:** calls to an existing API built this way, such as the repo's
HTTP client (pass the type argument there); a type parameter that also
appears in a parameter, a constraint or a callback; classes where `T` ties
several members together; safely constructed generic results, such as an empty
`T[]` that does not claim existing data has type `T`.

**Bad:**

```ts
function readSetting<T>(key: string): T {
  return JSON.parse(localStorage.getItem(key) ?? "null");
}
```

**Good:**

```ts
function readSetting(key: string): unknown {
  return JSON.parse(localStorage.getItem(key) ?? "null");
}
```
