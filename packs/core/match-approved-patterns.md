---
id: core/match-approved-patterns
title: Copy approved patterns, not whatever is nearby
applies: ["**/*"]
severity: should-fix
stage: both
status: draft
source: Google Engineering Practices, "The Standard of Code Review", https://google.github.io/eng-practices/review/reviewer/standard.html; taste's own design (repo notes in invariants.md, patterns.md and dont-copy.md)
quote: "If no other rule applies, then the reviewer may ask the author to be consistent with what is in the current codebase, as long as that doesn't worsen the overall code health of the system."
added: 2026-10-19
---

Follow the patterns the repo marks as approved (its `invariants.md`,
`patterns.md`, and the packs). Never copy a pattern listed in `dont-copy.md`.
Matching the code next to you is a reason only when no rule or note says
otherwise and the copy doesn't make the code worse: much of that code may have
been written by agents and never reviewed.

**Why:** Agents copy the code around them. In a repo with bad patterns, that
spreads them faster than anyone can clean them up.

**Flag:** new code that copies a `dont-copy.md` pattern or breaks a pack rule,
defended only because nearby code does the same.

**Don't flag:** code that follows an approved pattern, even one the reviewer
would not have chosen; matching the repo's style where no rule or note says
otherwise. Changing an approved pattern is its own planned change.

**Bad:**

```go
// The other services use the Impl pattern, so this one does too.
type AlertService interface{ Fire(a Alert) error }

type alertServiceImpl struct{ n Notifier }

func NewAlertService(n Notifier) AlertService { return &alertServiceImpl{n: n} }
```

**Good:**

```go
// dont-copy.md lists the Impl pattern, so return the concrete type.
type AlertService struct{ n Notifier }

func NewAlertService(n Notifier) *AlertService { return &AlertService{n: n} }
```
