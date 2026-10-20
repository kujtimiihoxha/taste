---
id: core/deep-not-shallow
title: Avoid helpers that add indirection without hiding work
applies: ["**/*"]
severity: should-fix
stage: diff
source: John Ousterhout and Robert Martin, "aposd-vs-clean-code" (Ousterhout's part), https://github.com/johnousterhout/aposd-vs-clean-code; John Ousterhout, "A Philosophy of Software Design", ch. 4 "Modules Should Be Deep"
quote: 'However, like most ideas in software design, decomposition can be taken too far. As methods get smaller and smaller there is less and less benefit to further subdivision. The amount of functionality hidden behind each interface drops, while the interfaces often become more complex. I call these interfaces "shallow": they don''t help much in terms of reducing what the programmer needs to know.'
added: 2026-10-19
---

Extract a function when its name and interface let callers understand the
operation without reading its body. Inline a forwarding helper when it adds
a jump but leaves callers needing the same details.

**Why:** A forwarding helper adds a name and a jump without hiding the
details its callers need. Readers open it only to find what they already knew.

**Flag:** forwarding helpers whose callers still need to know the wrapped
implementation, or helpers that must be read together to understand one
operation. Explain the extra work the reader must do; length and number of
callers alone are not reasons.

**Don't flag:** required adapters or framework callbacks, a useful domain
name, an invariant or public API boundary, or a helper that hides a real
decision. A function can serve one caller and still do useful work.

**Bad:**

```ts
// These private helpers only rename field reads; they are not an API boundary.
function isRuleEnabled(rule: Rule): boolean {
  return rule.enabled;
}

function getRuleName(rule: Rule): string {
  return rule.name;
}

function buildLabel(rule: Rule): string {
  return getRuleName(rule) + (isRuleEnabled(rule) ? "" : " (off)");
}
```

**Good:**

```ts
function buildLabel(rule: Rule): string {
  return rule.name + (rule.enabled ? "" : " (off)");
}
```
