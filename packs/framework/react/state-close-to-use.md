---
id: react/state-close-to-use
title: Keep state close to where it's used
applies: ["**/*.tsx", "**/*.jsx"]
severity: should-fix
stage: both
status: draft
source: react.dev, memo reference (Should you add memo everywhere?), https://react.dev/reference/react/memo#should-you-add-memo-everywhere
quote: "Prefer local state and don't lift state up any further than necessary. For example, don't keep transient state like forms and whether an item is hovered at the top of your tree or in a global state library."
added: 2026-10-19
---

Put state in the lowest component that needs it. Lift it only as far as the
closest common parent of the components that read it. A form's fields, a
dialog's open flag or a hover belong in the component that shows them, not at
the top of the page or in the app's global store.

**Why:** State held too high re-renders everything below it on every change,
and spreads one concern across a store, actions and selectors. Local state is
easy to find and goes away with the component.

**Flag:** a form's fields or a dialog's open flag added to a global store
(Redux, Zustand) or to a page component, when one component reads them; a new
context made to share one form's state.

**Don't flag:** state that distant parts of the app really share (the current
user, theme, locale); state that must outlive the component, like a draft the
user can come back to; state the URL should hold, such as filters or the
active tab.

**Bad:**

```tsx
// The store gained a slice for one dialog's draft name.
const name = useAppSelector((s) => s.ruleDialog.draftName);
const dispatch = useAppDispatch();
return <input value={name} onChange={(e) => dispatch(setDraftName(e.target.value))} />;
```

**Good:**

```tsx
const [name, setName] = useState("");
return <input value={name} onChange={(e) => setName(e.target.value)} />;
```
