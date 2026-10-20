---
id: core/new-dependency-needs-a-reason
title: A new dependency needs a reason and a human OK
applies: ["**/*"]
severity: should-fix
stage: both
status: draft
source: Russ Cox, "Our Software Dependency Problem" (2019), https://research.swtch.com/deps; Go Proverbs, "A little copying is better than a little dependency"; Dan McKinley, "Choose Boring Technology" (2015)
quote: "Adding a package as a dependency outsources the work of developing that code—designing, writing, testing, debugging, and maintaining—to someone else on the internet, someone you often don't know."
added: 2026-10-19
---

Add a dependency only when the standard library and the repo's existing
dependencies can't do the job, the package is maintained, and it's worth its
upgrade and security cost. Ask a human before adding one.

**Why:** Every dependency is code you don't control, updates you have to make
and a security risk you take on, often to save a few lines.

**Flag:** new entries in go.mod, package.json or similar, especially ones used
once or for something the standard library already does.

**Don't flag:** a dependency the plan names and a human approved, or a move
from one version of an existing dependency to another.

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
