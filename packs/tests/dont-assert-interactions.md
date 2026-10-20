---
id: tests/dont-assert-interactions
title: Check the result, not the calls that made it
applies: tests
severity: should-fix
stage: diff
status: draft
source: https://abseil.io/resources/swe-book/html/ch12.html#test_statecomma_not_interactions, Software Engineering at Google (2020), ch. 12 "Unit Testing", "Test State, Not Interactions"
quote: "Interaction tests tend to be more brittle than state tests for the same reason that it’s more brittle to test a private method than to test a public method: interaction tests check how a system arrived at its result, whereas usually you should care only what the result is."
added: 2026-10-19
---

Check the value the code returns or the state it leaves behind, not the calls
it made to get there. Assert a call only when making that call is the behavior:
it changes something outside the code under test.

**Why:** Call-by-call assertions copy the implementation into the test. A
refactor that keeps the result the same breaks them, and a bug that undoes the
result after the call still passes.

**Flag:** checks that read-only calls (get, find, load) were made; checks on
call order or exact call lists of fakes and mocks; `EXPECT().Times(1)` chains
that restate the code line by line.

**Don't flag:** a call that is the behavior: sending an email, writing an audit
log, charging a card. Then check it happened, with the arguments that matter.
Also a call count that is the behavior itself, like a cache that must reach the
backend only once, or an order required by the protocol being tested.

**Bad:**

```go
func TestRenameRule(t *testing.T) {
	store := &recordingStore{rules: map[string]Rule{
		"cpu": {ID: "cpu", Expr: "cpu > 90"},
	}}
	Rename(store, "cpu", "cpu-high")
	want := []string{"Get cpu", "Delete cpu", "Put cpu-high"}
	if !slices.Equal(store.calls, want) {
		t.Fatalf("calls = %v, want %v", store.calls, want)
	}
}
```

**Good:**

```go
func TestRenameRule(t *testing.T) {
	store := &recordingStore{rules: map[string]Rule{
		"cpu": {ID: "cpu", Expr: "cpu > 90"},
	}}
	Rename(store, "cpu", "cpu-high")
	got, err := store.Get("cpu-high")
	if err != nil || got.ID != "cpu-high" || got.Expr != "cpu > 90" {
		t.Fatalf("renamed rule = %v, %v; want cpu-high with cpu > 90", got, err)
	}
	if _, err := store.Get("cpu"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("Get(cpu) after rename = %v, want ErrNotFound", err)
	}
}
```
