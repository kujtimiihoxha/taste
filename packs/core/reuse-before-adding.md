---
id: core/reuse-before-adding
title: Look for existing code before writing new code
applies: ["**/*"]
severity: should-fix
stage: both
source: John Carmack, "John Carmack on Inlined Code" (2007), http://number-none.com/blow/john_carmack_on_inlined_code.html; Kent Beck's rules of simple design, "no duplication"
quote: "I tracked all the bugs (problems that surfaced after I thought everything was working correctly) I fixed for a while, and I was quite surprised at how often copy-paste-modify operations resulted in subtle bugs that weren't immediately obvious."
added: 2026-10-19
---

Before writing a helper, search the repo, the standard library and the
libraries the repo already depends on for one with the same behavior. Call it
when its dependency direction and ownership fit. Don't write a near-copy of
code that already meets this requirement.

**Why:** Copies drift apart, bugs get fixed in one copy only, and readers have
to learn two things that do the same job.

**Flag:** new code duplicating an existing suitable helper or standard
library call (name it and its equivalent behavior); a pasted block that
repeats the same policy with small edits.

**Don't flag:** when the existing code behaves differently in a way that
matters here (say how); using it would pull in a heavy dependency or cross an
ownership boundary; similar code represents separate policies; setup repeated
in tests so each test reads on its own.

**Bad:**

```go
// Existing in this package: ownerNames(rules []Rule) []string.
// It keeps rule order and duplicates; empty input gives a non-nil empty slice.

func ownersForRules(rules []Rule) []string {
	owners := make([]string, 0, len(rules))
	for _, r := range rules {
		owners = append(owners, r.Owner)
	}
	return owners
}

owners := ownersForRules(rules)
```

**Good:**

```go
// Existing in this package: ownerNames(rules []Rule) []string.
// It keeps rule order and duplicates; empty input gives a non-nil empty slice.

owners := ownerNames(rules)
```
