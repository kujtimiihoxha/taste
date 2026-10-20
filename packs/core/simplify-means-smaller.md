---
id: core/simplify-means-smaller
title: A simplification should shrink the code
applies: ["**/*"]
severity: should-fix
stage: diff
source: Martin Fowler, "BeckDesignRules" (2015), on Kent Beck's rules of simple design ("fewest elements"), https://martinfowler.com/bliki/BeckDesignRules.html; taste's size budget
quote: "The last rule tells us that anything that doesn't serve the three prior rules should be removed."
added: 2026-10-19
---

A change called simplify, cleanup or refactor should leave less code: fewer
lines of code (tests, blank lines and comments don't count), fewer branches,
and no new types, files, exports or dependencies. When something has to grow,
the change says what each addition is for, and the reviewer decides whether
the reason holds: plainer code or a real seam, not more layers or checks.

This is taste's local size budget. Beck's rules put correctness and clear
intent before minimizing elements; the budget does not replace those checks.

**Why:** Added layers can leave more code to maintain even when described as
cleanup. Size makes that cost visible, but behavior and clarity still matter.

**Flag:** a simplify pass that ends with more code, more branches, or new
types, files or exports than it started with, and no reason that holds.

**Don't flag:** additions inside tests, a new helper that replaces several
copies, a clever one-liner turned into plain code, or a magic number given a
name.

**Bad:**

```go
// "Simplify" the retry loop by adding a policy type.
type RetryPolicy struct {
	MaxAttempts int
	Backoff     time.Duration
}

func (p RetryPolicy) Do(fn func() error) (err error) {
	for i := 0; i < p.MaxAttempts; i++ {
		if err = fn(); err == nil {
			return nil
		}
		time.Sleep(p.Backoff)
	}
	return err
}

func sendWithRetry() error {
	return (RetryPolicy{MaxAttempts: 3, Backoff: time.Second}).Do(send)
}
```

**Good:**

```go
func sendWithRetry() (err error) {
	for i := 0; i < 3; i++ {
		if err = send(); err == nil {
			return nil
		}
		time.Sleep(time.Second)
	}
	return err
}
```
