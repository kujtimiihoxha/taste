---
id: core/evidence-for-architecture
title: Architecture changes need a reason from this repo
applies: ["**/*"]
severity: should-fix
stage: plan
source: Martin Fowler, "An example of preparatory refactoring" (2015), https://martinfowler.com/articles/preparatory-refactoring-example.html; Kent Beck, "make the change easy, then make the easy change"
quote: 'This is where I''m adding a new feature, and I see that the existing code is not structured in such a way that makes adding the feature easy. So first I refactor the code into the structure that makes it easy to add the feature, or as Kent Beck pithily put it "make the change easy, then make the easy change".'
added: 2026-10-19
---

When a plan changes structure to make this task easier, name the current
obstacle it removes. A new layer, package split or service needs a present
job, not a possible future use. Make substantial preparatory structure changes
in their own step (`core/split-structure-from-behavior`), then make the
behavior change.

**Why:** Structure changes justified by principles alone ("clean
architecture", "separation of concerns") add layers that solve nothing. A
change that makes the next change easy pays off right away.

**Flag:** plans that add a layer, split, service or pattern only for
hypothetical flexibility, without naming a current problem it solves.

**Don't flag:** structure work the task requests, or a change that addresses
a demonstrated current reliability, security, performance or maintenance
problem.

**Bad:**

```text
Plan: add a repository layer between the handlers and the database,
following clean architecture, to make the code more maintainable.
```

**Good:**

```text
Plan: this task adds per-team alert filters to two handlers that build the
same query separately.
Step 1: move their shared query building to alerts/query.go, no behavior change.
Step 2: add the filters there.
```
