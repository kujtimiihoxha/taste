---
id: go/defer-cleanup
title: Keep cleanup beside acquisition, at the right scope
applies: ["**/*.go"]
severity: should-fix
stage: diff
source: https://github.com/uber-go/guide/blob/master/style.md#defer-to-clean-up; Uber Go Style Guide, "Defer to Clean Up"; https://go.dev/doc/effective_go#defer, Effective Go, "Defer"
quote: "Use defer to clean up resources such as files and locks."
added: 2026-10-21
---

When a resource belongs to this function until it returns, put its cleanup
in a `defer` beside the successful acquisition. Keep the intended lifetime:
`defer` runs at function exit, not at the end of a loop iteration. Release
per-item resources within the iteration when keeping them would accumulate
open files or hold a lock across the next iteration.

**Why:** copying cleanup onto each return path makes it easy for a new path
to miss it. Deferring at the wrong scope can keep resources long after their
work is done.

**Flag:** duplicated releases on return paths that one defer would cover;
an early return that skips owned cleanup; a loop accumulating deferred
releases when resources must be released per iteration. Name the resource
and its intended lifetime.

**Don't flag:** explicit early release before other work; ownership passed
to a caller; cleanup already managed by another API; bounded batches that
intentionally retain resources until return. Leave diagnostics such as
Staticcheck's SA9001 to the tool. Handling a meaningful Close or Flush error
is `core/dont-hide-failures`, not a reason to add generic cleanup machinery.

**Bad:**

```go
func (q *Quota) Reserve() bool {
	q.mu.Lock()
	if q.used == q.limit {
		q.mu.Unlock()
		return false
	}
	q.used++
	q.mu.Unlock()
	return true
}
```

**Good:**

```go
func (q *Quota) Reserve() bool {
	q.mu.Lock()
	defer q.mu.Unlock()
	if q.used == q.limit {
		return false
	}
	q.used++
	return true
}
```
