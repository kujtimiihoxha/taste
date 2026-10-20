---
id: react/no-redundant-state
title: Keep state minimal, with no copies and nothing you can compute
applies: ["**/*.tsx", "**/*.jsx"]
severity: should-fix
stage: diff
status: draft
source: react.dev, "Choosing the State Structure" (Avoid redundant state), https://react.dev/learn/choosing-the-state-structure#avoid-redundant-state
quote: "If you can calculate some information from the component's props or its existing state variables during rendering, you should not put that information into that component's state."
added: 2026-10-19
---

Store the least state that describes the screen. If a value can be computed
from props or other state, compute it while rendering. Don't keep the same
data in two places: store the selected item's id, not a copy of the item.

**Why:** Every extra piece of state has to be kept in sync by hand, and sooner
or later one update forgets. A value computed during render can't go stale.

**Flag:** `fullName` stored next to `firstName` and `lastName`; a selected
object copied out of a list; a flag like `hasSelection` next to the value it
describes; a value that handlers or callbacks write to state but render could
compute. An effect that sets such state right away is left to the lint
(`react-hooks/set-state-in-effect`).

**Don't flag:** a draft the user edits before saving; a value captured once
on purpose, like the time a dialog opened. A prop put into `useState` is
react/dont-copy-props-to-state. For booleans that can't both be true, see
typescript/discriminated-unions.

**Bad:**

```tsx
const [items, setItems] = useState<Item[]>([]);
const [selected, setSelected] = useState<Item | null>(null);
const [hasSelection, setHasSelection] = useState(false);
```

**Good:**

```tsx
const [items, setItems] = useState<Item[]>([]);
const [selectedId, setSelectedId] = useState<string | null>(null);
const selected = items.find((i) => i.id === selectedId);
```
