---
id: react/dont-silence-hooks-lint
title: Fix the code instead of silencing the hooks lint
applies: ["**/*.tsx", "**/*.jsx", "**/*.ts", "**/*.js"]
severity: should-fix
stage: diff
source: react.dev, "Removing Effect Dependencies" (To change the dependencies, change the code), https://react.dev/learn/removing-effect-dependencies#to-change-the-dependencies-change-the-code
quote: 'When dependencies don''t match the code, there is a very high risk of introducing bugs. By suppressing the linter, you "lie" to React about the values your Effect depends on.'
added: 2026-10-20
---

In React components and custom Hooks, fix correctness warnings instead of
suppressing them. A new `react-hooks` suppression needs a demonstrated tool
limitation or false positive. For dependency warnings, change the code until
the rule passes: move the function or object into the effect, use an updater like
`setCount((c) => c + 1)`, or, on React 19.2+, read values that shouldn't
restart the effect through `useEffectEvent`.

**Why:** The dependency list has to match the code. A silenced effect keeps
the values from the render that created it, so it reads stale props and state,
and nothing warns about it anymore. Some other plugin diagnostics report unsupported compiler optimizations;
those do not by themselves prove a correctness bug.

**Flag:** a new `eslint-disable` hiding a real React correctness problem,
most often to force
`[]` onto an effect that reads props or state; `useEffectEvent` used only to
drop a value that should restart the effect.

**Don't flag:** a documented workaround for a tool limitation or false
positive; suppressions already in code the change doesn't touch (the
plugin's docs say old violations can be fixed over time); `useEffectEvent`
for logic that really is an event fired from an effect, like a notification
that reads the current theme.

**Bad:**

```tsx
useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000);
  return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

**Good:**

```tsx
useEffect(() => {
  const id = setInterval(() => setCount((c) => c + 1), 1000);
  return () => clearInterval(id);
}, []);
```
