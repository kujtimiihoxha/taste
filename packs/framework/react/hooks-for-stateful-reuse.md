---
id: react/hooks-for-stateful-reuse
title: Write a custom hook only to reuse stateful logic
applies: ["**/*.tsx", "**/*.jsx"]
severity: should-fix
stage: diff
status: draft
source: react.dev, "Reusing Logic with Custom Hooks" (Should all functions called during rendering start with the use prefix?), https://react.dev/learn/reusing-logic-with-custom-hooks#should-all-functions-called-during-rendering-start-with-the-use-prefix
quote: "Functions that don't call Hooks don't need to be Hooks. If your function doesn't call any Hooks, avoid the use prefix."
added: 2026-10-19
---

A custom hook shares stateful logic: state, effects, subscriptions. Name a
function `use...` only if it calls hooks. A plain calculation is a plain
function. Don't write "lifecycle" hooks like `useMount` that only wrap
`useEffect`.

**Why:** The `use` name tells readers, and the hooks lint, that the function
holds state or effects. The lint then forbids calling it in a condition or a
loop, which a plain function never needs. A `useMount` wrapper hides its
effect from the dependency lint, so a missing dependency goes unreported.

**Flag:** `use...` functions that call no hooks; `useMount`, `useEffectOnce`
or `useUpdateEffect` style wrappers around `useEffect`.

**Don't flag:** a function that will call hooks soon, as the plan says; a hook
that names a real concept with its own state and effects (`useOnlineStatus`),
even with one caller. react.dev suggests wrapping an effect that way, which is
the React twist on core/no-single-use-abstraction.

**Bad:**

```tsx
function useFiringCount(alerts: Alert[]) {
  return alerts.filter((a) => a.state === "firing").length;
}
```

**Good:**

```tsx
function countFiring(alerts: Alert[]) {
  return alerts.filter((a) => a.state === "firing").length;
}
```
