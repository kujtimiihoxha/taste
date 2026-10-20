---
id: go/no-impossible-checks
title: Don't guard nil maps and slices; Go already handles them
applies: ["**/*.go"]
severity: should-fix
stage: diff
status: draft
source: https://go.dev/ref/spec#Index_expressions; The Go Programming Language Specification, "Index expressions", "For statements with range clause" and "Length and capacity"
quote: "if the map is nil or does not contain such an entry, a[x] is the zero value for the element type of M"
added: 2026-10-19
---

In Go, reading a nil map or a missing key gives the zero value, `len` of a
nil map or slice is 0, and ranging over one does nothing. Don't add nil,
length or comma-ok checks whose only job is to skip work that already does
nothing. This is the Go form of `core/new-check-needs-a-real-input`: the
language already handles these cases, so the guard handles nothing.

**Why:** the guard is a branch that does nothing the code below wouldn't.
Readers look for the case that needs it, and there isn't one.

**Flag:**

- `if m == nil` before reading from a map.
- `if len(xs) > 0` around `for _, x := range xs`.
- A comma-ok check whose early return gives the same result as no check.

**Don't flag:** writes to a map that may be nil, which panic, such as lazy
setup in a type whose zero value is meant to work; a check whose branch does
something the zero value wouldn't, like returning `ErrNotFound`; a nil check
around a `range` or a `delete`, which staticcheck already reports (S1031,
S1033).

**Bad:**

```go
func firingCount(byRule map[string][]Alert, rule string) int {
	if byRule == nil {
		return 0
	}
	alerts, ok := byRule[rule]
	if !ok || len(alerts) == 0 {
		return 0
	}
	n := 0
	for _, a := range alerts {
		if a.Firing {
			n++
		}
	}
	return n
}
```

**Good:**

```go
func firingCount(byRule map[string][]Alert, rule string) int {
	n := 0
	for _, a := range byRule[rule] {
		if a.Firing {
			n++
		}
	}
	return n
}
```
