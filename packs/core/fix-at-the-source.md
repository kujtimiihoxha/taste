---
id: core/fix-at-the-source
title: Fix a problem where it starts, not where it shows
applies: ["**/*"]
severity: should-fix
stage: both
status: draft
source: John Ousterhout, "My Favorite Sayings", "If you don't know what the problem was, you haven't fixed it", https://web.stanford.edu/~ouster/cgi-bin/sayings.php; John Ousterhout, "A Philosophy of Software Design", ch. 8 "Pull Complexity Downwards"
quote: "Don't ever assume that a problem has been fixed until you can identify the exact lines of code that caused it and convince yourself that the particular code really explains the behavior you have seen."
added: 2026-10-19
---

Fix a bug in the code that causes it, and say what the cause was. When callers
guard, patch or work around a bad value, change the code that produces it, once.
Don't add a guard, a default, a retry or a sleep where the symptom shows up.

**Why:** A patch where the symptom shows leaves the cause in place, so the bug
comes back somewhere else. A guard copied into every caller is the same
decision made many times, slightly differently each time.

**Flag:** a fix at a call site when the function itself returns the bad value;
the same guard, fallback or conversion repeated around calls to one function;
a bug fix that adds a retry, timeout, sleep or null check and doesn't name the
cause.

**Don't flag:** when the producer is outside your control (a third-party API).
Then wrap it once at the edge and fix it there. Also a stopgap marked as one,
with a link to the real fix.

**Bad:**

```ts
// getUser() can return undefined, so every caller guards it.
const user = getUser();
const name = user?.name ?? "unknown";
const id = user?.id ?? "";
```

**Good:**

```ts
// getUser() throws when there is no session, so callers just use it.
const user = getUser();
const name = user.name;
const id = user.id;
```
