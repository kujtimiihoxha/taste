---
id: core/new-check-needs-a-real-input
title: A new check needs a real input that reaches it
applies: ["**/*"]
severity: should-fix
stage: diff
status: draft
source: Alexis King, "Parse, don't validate" (2019), https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/; James Shore, "Fail Fast" (2004)
quote: "We already checked that the list is non-empty, why do we have to clutter our code with another redundant check?"
added: 2026-10-19
---

Only add a check, fallback or special case if you can name a real input or
code path that reaches it. If a state can't happen, don't handle it. If it
would mean a bug elsewhere, let it fail loudly instead of returning a polite
error.

**Why:** Handling impossible states makes code long and hides bugs. A crash
with a stack trace points right at the bug; a quiet fallback three layers away
points nowhere.

**Flag:** nil checks on receivers or on fields the constructor always sets,
checks for states the types or an earlier check rule out, "just in case"
defaults, and review comments asking "what if X is nil?" without a path that
makes X nil.

**Don't flag:** values from outside the process, checked where they come in; a
library's public functions, which are the edge for their callers; optional
fields the type says can be missing; a check whose comment names the real
input that reaches it.

**Bad:**

```go
func (s *Store) Rule(id string) (Rule, error) {
	if s == nil {
		return Rule{}, errors.New("store is nil")
	}
	if s.rules == nil {
		return Rule{}, errors.New("rules map is nil")
	}
	r, ok := s.rules[id]
	if !ok {
		return Rule{}, ErrNotFound
	}
	return r, nil
}
```

**Good:**

```go
func (s *Store) Rule(id string) (Rule, error) {
	r, ok := s.rules[id]
	if !ok {
		return Rule{}, ErrNotFound
	}
	return r, nil
}
```
