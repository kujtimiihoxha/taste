---
id: tests/no-tautologies
title: Write expected values as literals, not logic
applies: tests
severity: should-fix
stage: diff
source: https://abseil.io/resources/swe-book/html/ch12.html#donapostrophet_put_logic_in_tests, Software Engineering at Google (2020), ch. 12 "Unit Testing", "Don't Put Logic in Tests"
quote: "The lesson is clear: in test code, stick to straight-line code over clever logic, and consider tolerating some duplication when it makes the test more descriptive and meaningful."
added: 2026-10-19
---

Write the expected value as a literal. Don't compute it with the same logic the
code uses, by calling the code under test, or with a branch that picks the
answer. Keep each test straight-line.

**Why:** If the test repeats the code's logic, a bug in that logic is in both
places, and the test still passes. A branch in a test means part of it may never
run.

**Flag:** expected values built with string formatting, loops, maps or helper
calls that mirror the code; `want := f(x)` where `f` is the function under test
or its twin; `if`/`else` or ternaries that choose the expected value; loops
that copy values from the actual result into the expected one. Checks that
never run belong to `tests/assertions-that-can-fail`.

**Don't flag:** properties that hold for any input (round trips like
`Parse(Format(x)) == x`, sortedness); expected values from an independent,
trusted source such as a known-good fixture file; a named constant that is
itself the spec, like the default timeout the code must use; the one loop that
runs a table of cases.

**Bad:**

```go
func TestDisplayName(t *testing.T) {
	r := Rule{Name: "cpu", Team: "infra"}
	want := strings.ToUpper(r.Team) + "/" + r.Name
	if got := DisplayName(r); got != want {
		t.Fatalf("got %q, want %q", got, want)
	}
}
```

**Good:**

```go
func TestDisplayName(t *testing.T) {
	got := DisplayName(Rule{Name: "cpu", Team: "infra"})
	if got != "INFRA/cpu" {
		t.Fatalf("got %q, want %q", got, "INFRA/cpu")
	}
}
```
