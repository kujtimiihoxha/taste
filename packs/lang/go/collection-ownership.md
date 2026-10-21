---
id: go/collection-ownership
title: Copy slices and maps when ownership must be separate
applies: ["**/*.go"]
severity: should-fix
stage: diff
status: draft
source: https://github.com/uber-go/guide/blob/master/style.md#copy-slices-and-maps-at-boundaries; Uber Go Style Guide, "Copy Slices and Maps at Boundaries"
quote: "users can modify a map or slice you received as an argument if you store a reference to it."
added: 2026-10-21
---

Assigning a slice or map does not copy its contents. Copy at an ownership
boundary when later mutation through one reference must not affect the other.
Use `slices.Clone` or `maps.Clone` (Go 1.21+) when a shallow copy is enough;
neither copies objects referenced by the elements.

**Why:** keeping a caller's map or returning an internal slice can let someone
change state without going through its owner. A lock around the return does
not protect the collection after the caller receives it.

**Flag:** retained inputs or returned collections whose shared storage breaks
the promised isolation, such as a snapshot that changes when the owner writes
again. Name the mutation path and the contract it breaks; sharing alone is
not a finding.

**Don't flag:** ownership transferred to the receiver; documented borrowed
views; intentional shared state with coordinated access; data that stays
read-only; in-place operations whose contract permits mutation. Don't request
copies at every call or a deep copy when shared elements are safe.

**Bad:**

```go
// NewFilter keeps its own allowed names; callers may reuse or change names.
func NewFilter(names []string) *Filter {
	return &Filter{names: names}
}
```

**Good:**

```go
// NewFilter keeps its own allowed names; callers may reuse or change names.
func NewFilter(names []string) *Filter {
	return &Filter{names: slices.Clone(names)}
}
```
