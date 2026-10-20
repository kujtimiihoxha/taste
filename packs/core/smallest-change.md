---
id: core/smallest-change
title: Make the smallest change that does the job
applies: ["**/*"]
severity: should-fix
stage: both
status: draft
source: Google Engineering Practices, "Small CLs", https://google.github.io/eng-practices/review/developer/small-cls.html; Kent Beck, "Tidy First?" (2023)
quote: "The CL makes a minimal change that addresses just one thing."
added: 2026-10-19
---

Change only what the task needs. Don't rename, reformat, move or "improve"
code the task didn't ask about. Don't add options, flags, parameters or
features nobody asked for.

**Why:** Extra changes hide the real change, slow down review, and add risk
with nothing gained.

**Flag:** edits outside the task: drive-by renames, moved code, new config
options, new parameters "for flexibility", reformatted lines that didn't
otherwise change.

**Don't flag:** a small cleanup the change needs in order to make sense, or a
fix the task's tests require. A bigger cleanup is fine as its own step.

**Bad:**

```go
// Task: return 404 when the rule is missing.
rule, err := h.store.Rule(ctx, id, LookupOptions{IncludeDisabled: true})
if errors.Is(err, ErrNotFound) {
	http.Error(w, "rule not found", http.StatusNotFound)
	return
}
```

**Good:**

```go
// Task: return 404 when the rule is missing.
rule, err := h.store.Rule(ctx, id)
if errors.Is(err, ErrNotFound) {
	http.Error(w, "rule not found", http.StatusNotFound)
	return
}
```
