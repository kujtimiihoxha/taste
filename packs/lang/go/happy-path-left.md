---
id: go/happy-path-left
title: Keep the happy path at the left edge
applies: ["**/*.go"]
severity: nit
stage: diff
source: https://go.dev/wiki/CodeReviewComments#indent-error-flow; Go Code Review Comments, "Indent Error Flow"; Effective Go, "If"; Google Go Style Guide, Decisions, "Indent error flow"
quote: "Try to keep the normal code path at a minimal indentation, and indent the error handling, dealing with it first."
added: 2026-10-19
---

Handle errors and special cases first and return early. Don't put the normal
path inside an `else` or several levels of `if`. After a branch that ends in
`return`, drop the `else`.

**Why:** a reader can follow the normal path straight down the left edge, and
each early return closes a case for good.

**Flag:** `if err == nil { ... } else { return err }`; `else` after a branch
that returns; the main work nested two or more levels deep.

**Don't flag:** a short `if`/`else` that picks between two values, and code
where both branches are normal paths.

**Bad:**

```go
u, err := s.users.ByID(ctx, id)
if err == nil {
	if u.Active {
		return u.Email, nil
	} else {
		return "", ErrInactive
	}
} else {
	return "", err
}
```

**Good:**

```go
u, err := s.users.ByID(ctx, id)
if err != nil {
	return "", err
}
if !u.Active {
	return "", ErrInactive
}
return u.Email, nil
```
