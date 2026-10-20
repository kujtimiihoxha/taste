---
id: tests/damp-not-dry
title: Keep what matters visible in the test
applies: tests
severity: should-fix
stage: diff
status: draft
source: https://abseil.io/resources/swe-book/html/ch12.html#shared_setup, Software Engineering at Google (2020), ch. 12 "Unit Testing", "Shared Setup"
quote: "Tests like these that explicitly care about particular values should state those values directly, overriding the default defined in the setup method if need be."
added: 2026-10-19
---

A reader should see in the test every value that decides its result. Set those
values in the test, even when setup or a helper could supply them. Build only
what this test needs; don't make it lean on a big shared fixture.

**Why:** When the values that matter live in setup or a helper three files away,
nobody can tell why the test passes, and changing the shared setup quietly
changes what other tests check.

**Flag:** assertions whose decisive inputs are hidden in setup, a fixture or
a shared variable; shared `newTestEnv`-style fixtures that build far more than
the test uses; helpers whose hidden defaults determine the asserted result.

**Don't flag:** small helpers that hide noise, not meaning (`mustParse(t, s)`),
builders whose defaults don't matter to the test, a shared fixture for an
expensive real resource such as a test database, a named constant that is
itself the specification (the default timeout the code must use), or a table
of cases kept next to the loop that runs it.

**Bad:**

```go
// Shared fixture values, defined away from the test.
var alertRule = Rule{Name: "cpu", Threshold: 90}
var alertSample = Sample{Value: 95}

func TestAlertFiresOverThreshold(t *testing.T) {
	n := &fakeNotifier{}
	NewEvaluator(n).Eval(alertRule, alertSample)
	if len(n.sent) != 1 {
		t.Fatalf("sent %d alerts, want 1", len(n.sent))
	}
}
```

**Good:**

```go
func TestAlertFiresOverThreshold(t *testing.T) {
	n := &fakeNotifier{}
	NewEvaluator(n).Eval(Rule{Name: "cpu", Threshold: 90}, Sample{Value: 95})
	if len(n.sent) != 1 {
		t.Fatalf("sent %d alerts, want 1", len(n.sent))
	}
}
```
