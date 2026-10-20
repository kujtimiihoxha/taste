---
id: tests/test-behavior-not-implementation
title: Test behavior through the public API
applies: tests
severity: should-fix
stage: both
source: https://abseil.io/resources/swe-book/html/ch12.html#test_via_public_apis, Software Engineering at Google (2020), ch. 12 "Unit Testing", "Test via Public APIs"
quote: "By far the most important way to ensure this is to write tests that invoke the system being tested in the same way its users would; that is, make calls against its public API rather than its implementation details."
added: 2026-10-19
---

Test what the code does, through the same API its callers use. Don't reach
into private fields, unexported helpers or internal objects. A test should still
pass after a refactor that keeps the behavior the same.

**Why:** Tests tied to the inside of the code break on every refactor, so people
stop trusting them and stop refactoring. Tests of behavior catch real breaks and
nothing else.

**Flag:** tests that read private or unexported fields, call internal helpers
when a public call reaches the same code, or inspect internal objects. Mocked
internals are `tests/real-then-fake-then-mock`; asserted calls are
`tests/dont-assert-interactions`.

**Don't flag:** tests of an internal helper that is a real unit with its own
callers, or a white-box test kept on purpose for a tricky algorithm, with a
comment saying why.

**Bad:**

```go
func TestAddRule(t *testing.T) {
	s := NewStore()
	s.Add(Rule{ID: "cpu"})
	if _, ok := s.rules["cpu"]; !ok {
		t.Fatal("rule not in internal map")
	}
}
```

**Good:**

```go
func TestAddRule(t *testing.T) {
	s := NewStore()
	s.Add(Rule{ID: "cpu"})
	if _, err := s.Rule("cpu"); err != nil {
		t.Fatalf("Rule(cpu) after Add: %v", err)
	}
}
```
