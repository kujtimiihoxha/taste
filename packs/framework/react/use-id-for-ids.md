---
id: react/use-id-for-ids
title: Make element ids with useId, not fixed strings
applies: ["**/*.tsx", "**/*.jsx"]
severity: should-fix
stage: diff
status: draft
source: react.dev, useId reference (Generating unique IDs for accessibility attributes), https://react.dev/reference/react/useId#generating-unique-ids-for-accessibility-attributes
quote: "However, hardcoding IDs like this is not a good practice in React. A component may be rendered more than once on the page—but IDs have to be unique!"
added: 2026-10-20
---

When a component links elements by id (`htmlFor`, `aria-describedby`,
`aria-labelledby`, `aria-controls`), get the id from `useId()` (React 18+).
Don't write a fixed string like `id="line-limit"`.

**Why:** A component can render more than once on a page, and then two
elements share one id. The second label focuses the first input, and a screen
reader reads the wrong description. The page looks fine, so nobody notices.

**Flag:** a string literal `id` that `htmlFor` or an `aria-*` attribute points
at, inside a reusable component; ids built from an index or a prop that two
instances can share, like ``id={`tabpanel-${index}`}``.

**Don't flag:** an id that something outside the component relies on (a URL
anchor or skip link, a script that looks up `#root`); an id the parent passes
in; projects on React 17 or older, which don't have `useId`.

**Bad:**

```tsx
function LineLimitField() {
  return (
    <>
      <label htmlFor="line-limit">Line limit</label>
      <input id="line-limit" type="number" />
    </>
  );
}
```

**Good:**

```tsx
function LineLimitField() {
  const id = useId();
  return (
    <>
      <label htmlFor={id}>Line limit</label>
      <input id={id} type="number" />
    </>
  );
}
```
