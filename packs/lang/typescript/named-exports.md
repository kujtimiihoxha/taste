---
id: typescript/named-exports
title: Use named exports, not default exports
applies: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"]
severity: nit
stage: diff
status: draft
source: Google TypeScript Style Guide, "Exports", https://google.github.io/styleguide/tsguide.html#exports
quote: "Default exports provide no canonical name, which makes central maintenance difficult with relatively little benefit to code owners, including potentially decreased readability"
added: 2026-10-19
---

Export things by name. Don't use `export default`.

**Why:** Named exports give each symbol a canonical exported name and keep
import spelling consistent by default.

**Flag:** `export default` in new modules.

**Don't flag:** files a framework or tool requires to have a default export
(some route, page, story or config files); `React.lazy` targets; changes that
only touch an existing default export; a repo where default exports are the
norm, where one named export would be a second way (`core/one-way-to-do-it`).

**Bad:**

```ts
export default function AlertList() {
  // ...
}
```

**Good:**

```ts
export function AlertList() {
  // ...
}
```
