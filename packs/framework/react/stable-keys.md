---
id: react/stable-keys
title: Give list items stable keys
applies: ["**/*.tsx", "**/*.jsx"]
severity: should-fix
stage: diff
status: draft
source: react.dev, "Rendering Lists" (Why does React need keys?), https://react.dev/learn/rendering-lists#why-does-react-need-keys
quote: "But the order in which you render items will change over time if an item is inserted, deleted, or if the array gets reordered. Index as a key often leads to subtle and confusing bugs."
added: 2026-10-19
---

Use a stable id from the data as each list item's `key`. Don't use the array
index when items can be added, removed, filtered or reordered.

**Why:** React matches items between renders by key. With index keys, a row's
state, input text and focus stay at the old position, so after a change they
show up on the wrong row. A key made fresh on each render remounts every row,
so inputs lose their text and focus.

**Flag:** `key={index}` or `key={i}` on lists that can be filtered, sorted, or
have items added or removed anywhere but the end, most of all when rows hold
state or inputs; `key={crypto.randomUUID()}` during render, which the lint
misses.

**Don't flag:** static lists that never change; lists that only grow at the
end; items with no id and no state in a list that is only ever replaced
whole. A missing key, or a key made with `Math.random()` during render, is
left to the lints (`react/jsx-key`, `react-hooks/purity`).

**Bad:**

```tsx
return (
  <ul>
    {rules.map((rule, i) => (
      <RuleRow key={i} rule={rule} />
    ))}
  </ul>
);
```

**Good:**

```tsx
return (
  <ul>
    {rules.map((rule) => (
      <RuleRow key={rule.uid} rule={rule} />
    ))}
  </ul>
);
```
