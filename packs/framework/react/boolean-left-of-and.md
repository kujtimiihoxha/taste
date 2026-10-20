---
id: react/boolean-left-of-and
title: Make the left side of && a boolean
applies: ["**/*.tsx", "**/*.jsx"]
severity: should-fix
stage: diff
source: react.dev, "Conditional Rendering" (Logical AND operator), https://react.dev/learn/conditional-rendering#logical-and-operator-
quote: "However, if the left side is 0, then the whole expression gets that value (0), and React will happily render 0 rather than nothing."
added: 2026-10-20
---

In JSX, don't put a number on the left of `&&`. Write
`{rules.length > 0 && <RuleList />}`, not `{rules.length && <RuleList />}`.

**Why:** `&&` gives back its left side when that side is falsy. `false`,
`null` and `undefined` render nothing, but `0` renders as the text "0". It
only shows up when the list is empty, so a quick look at the page misses it.

**Flag:** `length &&`, `count &&` or any other number on the left of `&&` in
JSX, including optional ones like `rule.errors?.length &&`.

**Don't flag:** a left side that is already a boolean (`isOpen`, `count > 0`,
`!!count`); a value that can't be a number, such as an object or an array; a
ternary that renders `null` in the other branch.

**Bad:**

```tsx
return <section>{rules.length && <RuleList rules={rules} />}</section>;
```

**Good:**

```tsx
return <section>{rules.length > 0 && <RuleList rules={rules} />}</section>;
```
