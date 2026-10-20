---
id: react/fetch-effects-need-cleanup
title: Effects that fetch must ignore stale responses
applies: ["**/*.tsx", "**/*.jsx", "**/*.ts", "**/*.js"]
severity: must-fix
stage: diff
source: react.dev, "Synchronizing with Effects" (Fetching data), https://react.dev/learn/synchronizing-with-effects#fetching-data
quote: "If your Effect fetches something, the cleanup function should either abort the fetch or ignore its result"
added: 2026-10-19
---

In React components and custom Hooks, when an effect fetches data, return a
cleanup that ignores or aborts the old request.

**Why:** Without cleanup, a slow old response can arrive after a newer one and
overwrite it, so the screen shows data for the wrong input.

**Flag:** a `useEffect` that fetches and calls a setter with no cleanup.

**Don't flag:** data loaded through the app's data layer (TanStack Query, SWR,
a router loader), which handles this already; results independently guarded against stale
completion. An empty dependency array does not prove the effect runs once.

**Bad:**

```tsx
useEffect(() => {
  fetchRules(folder).then(setRules);
}, [folder]);
```

**Good:**

```tsx
useEffect(() => {
  let ignore = false;
  fetchRules(folder).then((r) => {
    if (!ignore) setRules(r);
  });
  return () => {
    ignore = true;
  };
}, [folder]);
```
