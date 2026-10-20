---
id: go/tests-table-driven
title: Put cases of one behavior in a table
applies: ["**/*_test.go"]
severity: should-fix
stage: diff
status: draft
source: https://go.dev/wiki/TableDrivenTests; Go wiki, "TableDrivenTests"; Google Go Style Guide, Decisions, "Table-driven tests"
quote: "If you ever find yourself using copy and paste when writing a test, think about whether refactoring into a table-driven test or pulling the copied code out into a helper function might be a better option."
added: 2026-10-19
---

When several cases test the same behavior with different inputs, write one
table and one loop. Use `t.Run` (or `b.Run` in a benchmark) when the cases
need names.

**Why:** a table puts the cases side by side, so they are easy to read and to
add to. Copied test functions drift apart, and a fix to one copy misses the
others.

**Flag:** test or benchmark functions that differ only in their inputs and
expected values; a new test function for a case an existing table already
fits.

**Don't flag:** a single case; cases that need different setup or different
checks, where a table would need function fields to tell them apart.

**Bad:**

```go
func TestParseSizeKB(t *testing.T) {
	got, err := ParseSize("1KB")
	if err != nil || got != 1024 {
		t.Errorf("got %d, %v", got, err)
	}
}

func TestParseSizeMB(t *testing.T) {
	got, err := ParseSize("1MB")
	if err != nil || got != 1<<20 {
		t.Errorf("got %d, %v", got, err)
	}
}
```

**Good:**

```go
func TestParseSize(t *testing.T) {
	for in, want := range map[string]int64{"1KB": 1024, "1MB": 1 << 20} {
		got, err := ParseSize(in)
		if err != nil || got != want {
			t.Errorf("ParseSize(%q) = %d, %v; want %d", in, got, err, want)
		}
	}
}
```
