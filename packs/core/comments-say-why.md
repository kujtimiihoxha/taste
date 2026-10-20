---
id: core/comments-say-why
title: Comments say why, not what
applies: ["**/*"]
severity: nit
stage: diff
status: draft
source: Google Engineering Practices, "What to look for in a code review", Comments, https://google.github.io/eng-practices/review/reviewer/looking-for.html; John Ousterhout, "A Philosophy of Software Design", ch. 12-13
quote: "Usually comments are useful when they explain why some code exists, and should not be explaining what some code is doing."
added: 2026-10-19
---

Write a comment when it tells the reader something the code can't: why it's
done this way, what would go wrong otherwise, what the caller must know.
Delete comments that repeat what the code says.

**Why:** Comments that repeat the code double what there is to read and go
stale. Comments that explain the reason are the ones readers need.

**Flag:** comments that restate the next line, doc comments that only repeat
the function name, section labels like "// Loop over items"; a magic number or
an assumption the code relies on, with no word on why.

**Don't flag:** doc comments on exported names that the language's tools
expect; comments that explain a reason or a trap; a comment that says what a
regular expression or a tricky algorithm does.

**Bad:**

```go
// Loop over the rules.
for _, r := range rules {
	// Skip disabled rules.
	if !r.Enabled {
		continue
	}
	// Evaluate the rule.
	eval(r)
}
```

**Good:**

```go
for _, r := range rules {
	// Disabled rules stay in the list so the UI can show them.
	if !r.Enabled {
		continue
	}
	eval(r)
}
```
