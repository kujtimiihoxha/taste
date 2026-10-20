---
id: core/new-dependency-needs-a-reason
title: A new dependency needs a reason and a human OK
applies: ["**/*"]
severity: should-fix
stage: both
source: Russ Cox, "Our Software Dependency Problem" (2019), https://research.swtch.com/deps; Go Proverbs, "A little copying is better than a little dependency"; Dan McKinley, "Choose Boring Technology" (2015); taste's human-approval policy
quote: "Adding a package as a dependency outsources the work of developing that code—designing, writing, testing, debugging, and maintaining—to someone else on the internet, someone you often don't know."
added: 2026-10-19
---

Add a direct dependency only when the standard library and existing packages
do not adequately meet the requirement, the package is maintained, and its
benefit is worth its upgrade and security cost. Taste's policy also requires
a human OK before adding a new direct dependency.

**Why:** Every dependency is code you don't control, updates you have to make
and a security risk you take on, often to save a few lines.

**Flag:** a new direct dependency without a human OK; one that duplicates an
adequate existing API without a concrete benefit. Name the existing option
and explain how it meets this task's requirements.

**Don't flag:** a dependency the plan names and a human approved, a version
upgrade of an existing dependency, or transitive lockfile changes.

**Bad:**

```ts
// Adds lodash to package.json for this one call.
import uniq from "lodash/uniq";

const owners = uniq(rules.map((r) => r.owner));
```

**Good:**

```ts
const owners = [...new Set(rules.map((r) => r.owner))];
```
