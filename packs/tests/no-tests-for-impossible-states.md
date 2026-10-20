---
id: tests/no-tests-for-impossible-states
title: Don't test states the code can't reach
applies: tests
severity: should-fix
stage: diff
status: draft
source: https://abseil.io/resources/swe-book/html/ch13.html#commercial_atdonotmock, Software Engineering at Google (2020), ch. 13 "Test Doubles", "Case Study: @DoNotMock"
quote: "These test doubles are very likely to exhibit behavior that violates the API contract of the type being mocked—for instance, returning null for a method that can never return null."
added: 2026-10-19
---

Build test states the real code can produce. Don't hand-build a state it can't
reach, just to exercise a guard or a branch: a stub that returns nothing from a
method that always returns something, a nil receiver, a zero struct the
constructor never returns, a race a lock prevents. When such a guard goes (see
`core/new-check-needs-a-real-input`), its test goes with it.

**Why:** These tests check behavior no user can reach. They make defensive code
look required and cleanup look risky, and they break when the real contract is
tightened.

**Flag:** stubs and mocks that return what the real dependency never returns;
tests that build an impossible state on purpose (a nil `*Store`, `undefined` for
a required field, a state written by hand that the real code would set
differently); names like `TestNilStore` or "handles undefined user".

**Don't flag:** inputs that really come from outside (malformed JSON, empty form
fields, a nil from a third-party API), or a regression test for a bug that
really happened, with a link to it.

**Bad:**

```go
func TestNotifyOwnerNilUser(t *testing.T) {
	users := &stubUsers{user: nil, err: nil} // UserStore never returns this
	err := NotifyOwner(users, Rule{Owner: "u1"})
	if err == nil || err.Error() != "user is nil" {
		t.Fatalf("got %v, want user is nil", err)
	}
}
```

**Good:**

```go
func TestNotifyOwnerUnknownUser(t *testing.T) {
	users := NewMemUsers() // no users yet
	err := NotifyOwner(users, Rule{Owner: "u1"})
	if !errors.Is(err, ErrUserNotFound) {
		t.Fatalf("got %v, want ErrUserNotFound", err)
	}
}
```
