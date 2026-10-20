---
id: react/test-what-users-see
title: Test components the way users use them
applies:
  [
    "**/*.test.tsx",
    "**/*.spec.tsx",
    "**/__tests__/**/*.tsx",
    "**/*.test.jsx",
    "**/*.spec.jsx",
    "**/__tests__/**/*.jsx",
  ]
severity: should-fix
stage: diff
status: draft
source: Testing Library, "About Queries" (Priority), https://testing-library.com/docs/queries/about#priority
quote: "The user cannot see (or hear) these, so this is only recommended for cases where you can't match by role or text or it doesn't make sense (e.g. the text is dynamic)."
added: 2026-10-19
---

Test a component the way a user uses it: find elements by role, label or
text, act with `userEvent`, and check what the user would see. This is the
React twist on tests/test-behavior-not-implementation: for a component, the
public API is the screen.

**Why:** Users don't see class names, test ids or state. Tests tied to them
break on every refactor and miss real breaks, like a switch that lost its
label.

**Flag:** `container.querySelector`, class-name or `getByTestId` queries where
a role, label or text exists; `fireEvent` where `userEvent` fits, often
wrapped in `act()` to quiet a warning; assertions on state, hook return values
or the props a child received.

**Don't flag:** `getByTestId` for an element with no role or text (a canvas
chart); `fireEvent` for events `userEvent` doesn't support.

**Bad:**

```tsx
test("enables the rule", () => {
  const { container } = render(<RuleToggle rule={rule} />);
  fireEvent.click(container.querySelector(".rule-toggle__switch")!);
  expect(container.querySelector(".is-enabled")).not.toBeNull();
});
```

**Good:**

```tsx
test("enables the rule", async () => {
  render(<RuleToggle rule={rule} />);
  await userEvent.click(screen.getByRole("switch", { name: "Enable cpu" }));
  expect(screen.getByRole("switch", { name: "Enable cpu" })).toBeChecked();
});
```
