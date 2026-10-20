---
id: core/no-compat-for-nobody
title: No compatibility code for something nobody uses yet
applies: ["**/*"]
severity: should-fix
stage: both
source: Martin Fowler, "Yagni" (2015), https://martinfowler.com/bliki/Yagni.html; Kent Beck, "Extreme Programming Explained" (1999); a person's review correction, 2026-10-19
quote: 'It''s a statement that some capability we presume our software needs in the future should not be built now because "you aren''t gonna need it".'
added: 2026-10-19
---

Don't add migrations, version bumps, old names, aliases, shims or fallbacks
to keep something working that nobody depends on yet: unreleased code, data
only you have, an API with no callers outside the change. Change it directly
and delete the old version.

**Why:** Compatibility code is worth its cost only when there are real users
to protect. Without them it's dead weight every reader still has to
understand, and it never gets removed.

**Flag:** "for backwards compatibility" code in a change to unreleased code;
migrations for data nobody else has; old names kept as aliases inside the same
change.

**Don't flag:** compatibility for something already released or shared: a
public API, a stored format other people have data in, a config file users
already wrote (see `core/dont-break-users`). The change should name who
depends on it.

**Bad:**

```ts
// The review database only exists on the author's machine so far.
const Rounds = defineDoc({
  kind: "taste.rounds",
  version: 2,
  initial: () => ({ rounds: 0, total: 0 }),
  migrate: (old) => ({ rounds: Number(old.rounds), total: 0 }),
});
```

**Good:**

```ts
const Rounds = defineDoc({
  kind: "taste.rounds",
  version: 1,
  initial: () => ({ rounds: 0, total: 0 }),
});
```
