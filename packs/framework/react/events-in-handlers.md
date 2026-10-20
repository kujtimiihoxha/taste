---
id: react/events-in-handlers
title: Put event logic in the event handler, not in an effect
applies: ["**/*.tsx", "**/*.jsx", "**/*.ts", "**/*.js"]
severity: should-fix
stage: diff
status: draft
source: react.dev, "You Might Not Need an Effect" (Sending a POST request), https://react.dev/learn/you-might-not-need-an-effect#sending-a-post-request
quote: "If this logic is caused by a particular interaction, keep it in the event handler. If it's caused by the user seeing the component on the screen, keep it in the Effect."
added: 2026-10-19
---

In React components and custom Hooks, if something should happen because
the user did something (clicked,
submitted, typed), do it in that event's handler. Don't set a flag in state
and react to it in a `useEffect`.

**Why:** An effect runs because the component rendered, not because of what
the user did. Logic hidden there is hard to follow and can run at the wrong
time, or twice.

**Flag:** a state flag like `submitted` or `shouldSave` that exists only to
trigger an effect; effects that send requests, show toasts or navigate in
response to a user action; an effect that calls a parent's `onChange` after
local state changes.

**Don't flag:** effects that run because the component is on screen (a page
view event, connecting to a server while it is shown); synchronization with
an external system that must follow reactive state regardless of what changed it.

**Bad:**

```tsx
const [submitted, setSubmitted] = useState(false);
useEffect(() => {
  if (submitted) saveRule(rule);
}, [submitted, rule]);
return <button onClick={() => setSubmitted(true)}>Save</button>;
```

**Good:**

```tsx
return <button onClick={() => saveRule(rule)}>Save</button>;
```
