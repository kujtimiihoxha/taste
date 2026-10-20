---
id: tests/fake-the-clock
title: Control time in tests with a fake clock
applies: tests
severity: should-fix
stage: diff
source: https://martinfowler.com/articles/nonDeterminism.html#Time, Martin Fowler, "Eradicating Non-Determinism in Tests" (2011), "Time"
quote: "The most important thing here is to ensure that you always wrap the system clock with routines that can be replaced with a seeded value for testing."
added: 2026-10-20
---

Don't let a test depend on the real time. Set the time the code sees: with the
test framework's fake clock, or by passing the code the time or a clock. To
test what happens later, move the fake clock forward. Don't wait for real time
to pass.

**Why:** A test that reads the real clock can pass today and fail at midnight,
at the end of the month or on a slow machine. Waiting for real timers also makes
the suite slow.

**Flag:** results that depend on the real now: code under test that calls
`time.Now()`, `Date.now()` or `datetime.now()`, checked against a hard-coded
date that will one day be in the past ("valid until 2027"); tests that wait for
a real timer or interval to fire.

**Don't flag:** code that only measures elapsed time for logs or metrics; tests
that already use a fake clock (Jest fake timers, freezegun or time-machine, a
clock passed in, Go's `testing/synctest`); end-to-end tests that must run in
real time, with generous limits.

**Bad:**

```go
func TestSilenceActiveUntilItEnds(t *testing.T) {
	s := Silence{EndsAt: time.Date(2027, 1, 1, 0, 0, 0, 0, time.UTC)}
	if !s.Active() { // Active compares EndsAt with time.Now()
		t.Fatal("silence should be active before it ends")
	}
}
```

**Good:**

```go
func TestSilenceActiveUntilItEnds(t *testing.T) {
	s := Silence{EndsAt: time.Date(2027, 1, 1, 0, 0, 0, 0, time.UTC)}
	if !s.ActiveAt(time.Date(2026, 12, 31, 0, 0, 0, 0, time.UTC)) {
		t.Fatal("silence should be active the day before it ends")
	}
}
```
