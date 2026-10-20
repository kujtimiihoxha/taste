---
id: core/one-way-to-do-it
title: Don't add a second way to do the same thing
applies: ["**/*"]
severity: should-fix
stage: both
status: draft
source: Software Engineering at Google (2020), ch. 15 "Deprecation" (Hyrum Wright), https://abseil.io/resources/swe-book/html/ch15.html; Danilo Sato, "ParallelChange" (2014)
quote: "Having two systems to accomplish the same thing might not seem like a pressing problem, but over time, the costs of maintaining them both can grow substantially."
added: 2026-10-19
---

Don't add a second HTTP client, logger, config loader, error type, state
store or test helper next to the one the repo already uses. If the old way
should go, plan the migration and finish it. A migration left half done means
two ways forever.

**Why:** Two ways to do one thing means every reader has to learn both, and
every new change has to pick one.

**Flag:** a new library or way of doing a job the repo already does one way
(name the one in use); a change that starts a migration without a plan to
finish it.

**Don't flag:** a step of a planned migration that names the end state and the
remaining steps.

**Bad:**

```ts
// The app uses fetchJson() from lib/http everywhere.
import axios from "axios";

const { data } = await axios.get<Rule[]>("/api/rules");
```

**Good:**

```ts
import { fetchJson } from "lib/http";

const data = await fetchJson<Rule[]>("/api/rules");
```
