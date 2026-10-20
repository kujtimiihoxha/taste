---
id: core/split-structure-from-behavior
title: Keep refactoring and behavior changes in separate steps
applies: ["**/*"]
severity: should-fix
stage: plan
source: Google Engineering Practices, "Small CLs", "Separate Out Refactorings", https://google.github.io/eng-practices/review/developer/small-cls.html; Kent Beck, "Tidy First?" (2023)
quote: "It's usually best to do refactorings in a separate CL from feature changes or bug fixes."
added: 2026-10-19
---

A plan puts moving, renaming and restructuring in its own step, before the
change in behavior. Each step works and passes tests on its own.

**Why:** A step that both moves code and changes what it does is hard to
review and hard to revert. Split apart, each step is easy to check.

**Flag:** a plan step that mixes "move, rename or restructure" with "change what
it does".

**Don't flag:** a rename of something the behavior change introduces, a small
cleanup like fixing a local variable's name, or a change so small that
splitting it would only add noise.

**Bad:**

```text
Steps:
1. Rename Notify to Send and add retries, updating all callers.
```

**Good:**

```text
Steps:
1. Rename Notify to Send. No behavior change.
2. Add retries to Send.
```
