---
id: react/dont-copy-props-to-state
title: Don't copy props into state
applies: ["**/*.tsx", "**/*.jsx"]
severity: should-fix
stage: diff
status: draft
source: react.dev, "Choosing the State Structure" (Don't mirror props in state), https://react.dev/learn/choosing-the-state-structure#don-t-mirror-props-in-state
quote: "Don't put props into state unless you specifically want to prevent updates."
added: 2026-10-19
---

Read props directly. Don't put a prop into `useState` and render the copy.

**Why:** `useState` only uses its argument on the first render. When the
parent passes a new value, the copy keeps the old one and the screen goes
stale. Then people add an effect to "fix" it.

**Flag:** `useState(props.x)` or `useState(x)` for a prop the parent can
change, when the user never edits the value.

**Don't flag:** a prop that is only a starting value and is named that way
(`initialValue`, `defaultQuery`) for state the user edits; resetting that
state on purpose with a `key`. An effect that copies a prop into state on
every change is left to the lint (`react-hooks/set-state-in-effect`).

**Bad:**

```tsx
function Title({ name }: { name: string }) {
  const [title] = useState(name);
  return <h2>{title}</h2>;
}
```

**Good:**

```tsx
function Title({ name }: { name: string }) {
  return <h2>{name}</h2>;
}
```
