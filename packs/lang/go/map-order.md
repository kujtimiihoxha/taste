---
id: go/map-order
title: Don't depend on map iteration order
applies: ["**/*.go"]
severity: should-fix
stage: diff
status: draft
source: https://go.dev/ref/spec#For_range; The Go Programming Language Specification, "For statements with range clause"
quote: "The iteration order over maps is not specified and is not guaranteed to be the same from one iteration to the next."
added: 2026-10-20
---

`range` over a map can visit the keys in a different order every time. When
that order shows up in a result (a string, a slice that someone compares, a
hash, an error message, API output), sort the keys first:
`slices.Sorted(maps.Keys(m))` (Go 1.23+).

**Why:** code that passes once gives a different answer on the next run.
Tests flake, hashes change between runs, and two machines disagree about the
same input.

**Flag:** a `range` over a map that appends to a slice, builds a string or
writes output that callers or tests expect in a fixed order; code that takes
"the first" key of a map when the caller needs a particular or stable key.

**Don't flag:** loops whose result doesn't depend on order (sums, counts,
building another map or set); results that are sorted afterwards; tests that
compare without order (`cmpopts.SortSlices`, `ElementsMatch`); intentional
selection of any arbitrary member; log lines.

**Bad:**

```go
func labelString(labels map[string]string) string {
	var parts []string
	for k, v := range labels {
		parts = append(parts, k+"="+v)
	}
	return strings.Join(parts, ",")
}
```

**Good:**

```go
func labelString(labels map[string]string) string {
	var parts []string
	for _, k := range slices.Sorted(maps.Keys(labels)) {
		parts = append(parts, k+"="+labels[k])
	}
	return strings.Join(parts, ",")
}
```
