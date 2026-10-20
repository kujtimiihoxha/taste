---
id: core/delete-first
title: Look for code to delete first
applies: ["**/*"]
severity: should-fix
stage: both
source: Software Engineering at Google (2020), ch. 15 "Deprecation" (Hyrum Wright), https://abseil.io/resources/swe-book/html/ch15.html; Joel Spolsky, "Things You Should Never Do, Part I" (2000)
quote: "Instead of focusing on how much code we can produce, or how large is our codebase, we should instead focus on how much functionality it can deliver per unit of code and try to maximize that metric. One of the easiest ways to do so isn't writing more code and hoping to get more functionality; it's removing excess code and systems that are no longer needed."
added: 2026-10-19
---

Before changing or adding code, look in the code you're touching for code you
can remove: dead branches, parameters that always get the same value, flags
that are always on, commented-out code, checks that can't fail. Removing code
is the best simplification there is. But first find out why the code is there:
its callers and its git history. Odd-looking old code is often a bug fix.

**Why:** Every line is something a reader has to understand and someone has to
keep working. Code that does nothing still costs that.

**Flag:** parameters every caller passes the same value, branches no caller can
reach, feature flags that are fully rolled out, old paths kept "just in case",
commented-out code.

**Don't flag:** code kept for a documented compatibility reason, with a link or
a date for removing it; exported code that users outside the repo may call
(`core/dont-break-users`); code whose purpose you can't confirm when no test
covers it (ask instead); dead code far from the change, which is its own
cleanup step; code the compiler or linter already reports as unused.

**Bad:**

```go
// verbose is always false since the --verbose flag was removed.
func render(r Rule, verbose bool) string {
	if verbose {
		return r.Name + " " + r.Expr + " " + r.Owner
	}
	return r.Name
}
```

**Good:**

```go
func render(r Rule) string {
	return r.Name
}
```
