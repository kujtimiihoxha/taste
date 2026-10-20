---
id: core/one-way-to-do-it
title: Don't add a second way to do the same thing
applies: ["**/*"]
severity: should-fix
stage: both
source: Software Engineering at Google (2020), ch. 15 "Deprecation" (Hyrum Wright), https://abseil.io/resources/swe-book/html/ch15.html; Danilo Sato, "ParallelChange" (2014)
quote: "Having two systems to accomplish the same thing might not seem like a pressing problem, but over time, the costs of maintaining them both can grow substantially."
added: 2026-10-19
---

When the repo already has a component that meets the same requirement, use
it rather than adding a competing HTTP client, logger, config loader, state
store or test helper. If the old way should go, plan the migration and finish
it. A migration left half done means two ways forever.

**Why:** Two ways to do one thing means every reader has to learn both, and
every new change has to pick one.

**Flag:** a competing component when the existing one supports the same use
case (name it and the equivalent behavior); a migration started without a
plan to finish it.

**Don't flag:** a step of a planned migration that names the end state and the
remaining steps; a materially different requirement the existing component
cannot meet; a runtime or ownership boundary that makes sharing unsuitable.

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
