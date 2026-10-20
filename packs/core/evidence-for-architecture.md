---
id: core/evidence-for-architecture
title: Architecture changes need a reason from this repo
applies: ["**/*"]
severity: should-fix
stage: plan
status: draft
source: Martin Fowler, "An example of preparatory refactoring" (2015), https://martinfowler.com/articles/preparatory-refactoring-example.html; Kent Beck, "make the change easy, then make the easy change"
quote: 'This is where I''m adding a new feature, and I see that the existing code is not structured in such a way that makes adding the feature easy. So first I refactor the code into the structure that makes it easy to add the feature, or as Kent Beck pithily put it "make the change easy, then make the easy change".'
added: 2026-10-19
---

Propose a new layer, a package split or merge, a new service or a new pattern
only when the change you're about to make is hard in the current structure.
Name that pain, not a principle; where recent bug fixes landed can back it.
Make the structure change first, as its own step
(`core/split-structure-from-behavior`), then make the change.

**Why:** Structure changes justified by principles alone ("clean
architecture", "separation of concerns") add layers that solve nothing. A
change that makes the next change easy pays off right away.

**Flag:** plans that add a layer, split, service or pattern with no change it
serves.

**Don't flag:** a structure change the task itself asks for.

**Bad:**

```text
Plan: add a repository layer between the handlers and the database,
following clean architecture, to make the code more maintainable.
```

**Good:**

```text
Plan: this task adds per-team alert filters, and their queries would go in
alerts/store.go, which 6 of the last 10 alert bug fixes touched.
Step 1: move query building to alerts/query.go, no behavior change.
Step 2: add the filters there.
```
