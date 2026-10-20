---
id: typescript/parse-at-the-edge
title: Parse outside data, don't cast it
applies: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"]
severity: should-fix
stage: both
status: draft
source: Dan Vanderkam, "The Seven Sources of Unsoundness in TypeScript", Type Assertions, https://effectivetypescript.com/2021/05/06/unsoundness/
quote: "You might fetch JSON via an API and give it a type using an assertion: const response = await fetch('/api/fun-fact'); const fact = await response.json() as FunFact; Nothing ensures that this API is actually returning a FunFact."
added: 2026-10-19
---

This is the TypeScript case of `core/new-check-needs-a-real-input`: parsing
JSON does not establish its declared runtime shape. `res.json()` and
`JSON.parse` return `any`, so any type you put on the result compiles, and
nothing checks it at run time. Give data from outside the program (API
responses, local storage, URL params, messages) a real check where it comes
in: the repo's schema library, or a type guard.

**Why:** A type on unchecked data is only a guess. When the guess is wrong,
the error shows up far away, as an `undefined` deep in the UI, instead of at
the edge with a message that says what was wrong.

**Flag:** `(await res.json()) as T`, `JSON.parse(text) as T`, or a type
annotation on their result, with no check; a URL param or stored value cast to
a narrower type with no check.

**Don't flag:** data the app's API client or schema layer already checked;
values made inside the program; fixtures in tests.

**Bad:**

```ts
async function loadUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  return (await res.json()) as User;
}
```

**Good:**

```ts
async function loadUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  return UserSchema.parse(await res.json());
}
```
