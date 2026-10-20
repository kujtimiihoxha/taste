---
id: core/reuse-before-adding
title: Look for existing code before writing new code
applies: ["**/*"]
severity: should-fix
stage: both
status: draft
source: John Carmack, "John Carmack on Inlined Code" (2007), http://number-none.com/blow/john_carmack_on_inlined_code.html; Kent Beck's rules of simple design, "no duplication"
quote: "I tracked all the bugs (problems that surfaced after I thought everything was working correctly) I fixed for a while, and I was quite surprised at how often copy-paste-modify operations resulted in subtle bugs that weren't immediately obvious."
added: 2026-10-19
---

Before writing a helper, search the repo, the standard library and the
libraries the repo already depends on for one that already does the job, and
call it. Don't write a near-copy.

**Why:** Copies drift apart, bugs get fixed in one copy only, and readers have
to learn two things that do the same job.

**Flag:** a new function whose job matches an existing helper or a standard
library call (name it), or a pasted block with small edits.

**Don't flag:** when the existing code behaves differently in a way that
matters here (say how), when using it would pull in a heavy dependency, or
setup repeated in tests so each test reads on its own.

**Bad:**

```go
func shortDuration(d time.Duration) string {
	return fmt.Sprintf("%dm%ds", int(d.Minutes()), int(d.Seconds())%60)
}

msg := "retrying in " + shortDuration(backoff)
```

**Good:**

```go
msg := "retrying in " + backoff.Round(time.Second).String()
```
