---
id: core/deep-not-shallow
title: Fewer, deeper functions over many tiny ones
applies: ["**/*"]
severity: should-fix
stage: diff
status: draft
source: John Ousterhout and Robert Martin, "aposd-vs-clean-code" (Ousterhout's part), https://github.com/johnousterhout/aposd-vs-clean-code; John Ousterhout, "A Philosophy of Software Design", ch. 4 "Modules Should Be Deep"
quote: 'However, like most ideas in software design, decomposition can be taken too far. As methods get smaller and smaller there is less and less benefit to further subdivision. The amount of functionality hidden behind each interface drops, while the interfaces often become more complex. I call these interfaces "shallow": they don''t help much in terms of reducing what the programmer needs to know.'
added: 2026-10-19
---

Don't split code into many tiny functions or files that each do almost
nothing. A function should hide more than it shows. Extract code when that
removes duplication or hides a real decision, not just to give three lines a
name.

**Why:** Each extracted function adds a name, a signature and a jump the reader
has to follow. Ten shallow functions are harder to read than one clear one.

**Flag:** functions whose body is about as long as their signature, one-line
wrappers around a field or a call, helpers used once, files that hold one tiny
function.

**Don't flag:** a well-named function that hides a real decision or is used in
several places, or a long function split along real seams, where each part has
its own job.

**Bad:**

```ts
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
