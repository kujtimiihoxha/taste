---
id: react/compose-over-flags
title: Compose components instead of adding flag props
applies: ["**/*.tsx", "**/*.jsx"]
severity: should-fix
stage: both
status: draft
source: Kent C. Dodds, "Inversion of Control", https://kentcdodds.com/blog/inversion-of-control
quote: "When you're thinking about how to create a nice API for people who are trying to do things slightly differently, instead of reaching for if statements and ternaries, consider the possibility of inverting control."
added: 2026-10-19
---

When a component needs another variant, let the caller pass the part that
changes as `children` or a slot prop, or wrap the component where it's used.
Don't keep adding props like `showHeader`, `withRefresh` or `tooltip` that
each switch on a block of markup.

**Why:** Each flag adds a branch, and the branches multiply: three flags make
eight cases. Most combinations are never used or tested, but every later
change has to keep them all working.

**Flag:** a new prop that only turns a block of markup or a wrapper on or off;
a component with three or more such props; props that only make sense
together.

**Don't flag:** a prop for a real state of the component (`disabled`,
`isOpen`, `selected`); a `variant` or `size` prop the design system already
uses; a flag on a component with a single caller, where a slot would only add
code.

**Bad:**

```tsx
<Panel title="Rules" showHeader showRefresh onRefresh={reload}>
  {list}
</Panel>
```

**Good:**

```tsx
<Panel header={<RefreshHeader title="Rules" onRefresh={reload} />}>{list}</Panel>
```
