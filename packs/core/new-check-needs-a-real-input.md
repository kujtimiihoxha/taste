---
id: core/new-check-needs-a-real-input
title: A new check needs a real input that reaches it
applies: ["**/*"]
severity: should-fix
stage: diff
source: Alexis King, "Parse, don't validate" (2019), https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/; James Shore, "Fail Fast" (2004)
quote: "We already checked that the list is non-empty, why do we have to clutter our code with another redundant check?"
added: 2026-10-19
---

Only add a check, fallback or special case for a reachable input or code path.
Before calling a check redundant, identify the invariant that rules its case
out and how supported construction and mutation paths preserve it.

**Why:** Redundant handling adds code without covering a real case. Quiet
fallbacks for broken invariants can hide bugs; an assertion can expose them.

**Flag:** checks or "just in case" defaults for states an established type,
construction or validation invariant rules out; review comments asking for
such handling without identifying a path that can reach it. A constructor
alone is not proof when supported callers can bypass it.

**Don't flag:** values from outside the process, checked where they come in; a
library's public functions, which are the edge for their callers; optional
fields the type says can be missing; documented nil or zero-value behavior;
an assertion that exposes a broken invariant; a check whose comment names
the real input that reaches it.

**Bad:**

```go
// Only the package constructor creates ruleStore; it initializes rules.
// Callers never pass nil or construct a zero store, and rules stays non-nil.
func (s *ruleStore) rule(id string) (Rule, error) {
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
// Only the package constructor creates ruleStore; it initializes rules.
// Callers never pass nil or construct a zero store, and rules stays non-nil.
func (s *ruleStore) rule(id string) (Rule, error) {
	r, ok := s.rules[id]
	if !ok {
		return Rule{}, ErrNotFound
	}
	return r, nil
}
```
