---
id: typescript/let-inference-work
title: Let inference work inside functions
applies: ["**/*.ts", "**/*.tsx"]
severity: nit
stage: diff
status: draft
source: Dan Vanderkam, Effective TypeScript, Item 19, "Avoid Cluttering Your Code with Inferable Types", https://effectivetypescript.com/2020/04/28/avoid-inferable/
quote: "Ideal TypeScript code includes type annotations for function/method signatures but not for the local variables created in their bodies."
added: 2026-10-19
---

Write types where they form a contract: exported functions, public fields,
module boundaries. Inside a function, let TypeScript infer the types of
locals.

**Why:** A type on every local repeats what the code already says, and it
drifts when the code changes.

**Flag:** `const count: number = 0`; `const names: string[] = users.map(...)`;
a local annotated with the type its value already has; types on callback
parameters that are already known.

**Don't flag:** return types on exported functions; an empty array or `null`
start value that needs a type (`const ids: string[] = []`); a type on an
object literal, so a wrong field is reported where it's written instead of
where the object is used.

**Bad:**

```ts
const total: number = items.length;
const names: string[] = items.map((item: Item): string => item.name);
```

**Good:**

```ts
const total = items.length;
const names = items.map((item) => item.name);
```
