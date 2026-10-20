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

Identify the code that violates the intended contract and explain how it
causes the reported behavior. Fix that code. Don't call a workaround a fix
while the known cause remains.

**Why:** A patch where the symptom shows leaves the cause in place, so the bug
comes back somewhere else. A guard copied into every caller is the same
decision made many times, slightly differently each time.

**Flag:** a workaround at a call site when the producer is shown to violate
its contract; the same correction repeated around calls to that producer;
a bug fix that adds a retry, timeout, sleep or null check without explaining
how it addresses the cause.

**Don't flag:** when the producer is outside your control (a third-party API).
Then wrap it once at the edge and fix it there. Also a stopgap marked as one,
with a link to the real fix; callers handling documented absence or failure;
a guard or retry that correctly addresses the identified cause.

**Bad:**

```ts
// Contract: owner names are trimmed and lowercase.
function normalizeOwner(owner: string): string {
  return owner.trim();
}

const owner = normalizeOwner(rawOwner).toLowerCase();
```

**Good:**

```ts
// Contract: owner names are trimmed and lowercase.
function normalizeOwner(owner: string): string {
  return owner.trim().toLowerCase();
}

const owner = normalizeOwner(rawOwner);
```
