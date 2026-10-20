---
id: go/ctx-first
title: Pass the caller's ctx as the first argument; never store it
applies: ["**/*.go"]
severity: should-fix
stage: diff
status: draft
source: https://pkg.go.dev/context; package context documentation; Go Code Review Comments, "Contexts"; Google Go Style Guide, Decisions, "Contexts"; The Go Blog, "Contexts and structs" (2021)
quote: "Do not store Contexts inside a struct type; instead, pass a Context explicitly to each function that needs it."
added: 2026-10-19
---

A function that needs a context takes `ctx context.Context` as its first
parameter and passes it to the calls it makes. Don't keep a context in a
struct field, don't hand one to the constructor of a type whose own `Run`,
`Start` or `Stop` should govern its life, and don't start a new
`context.Background()` or `context.TODO()` in code that was called with a
context.

**Why:** the caller's context carries its deadline and cancellation. A
stored or new context drops them, so work goes on after the request is gone,
and readers can't tell which call a stored context belongs to.

**Flag:** struct fields of type `context.Context`; constructors that take a
context for a type that also has `Run`, `Start` or `Stop` methods; `ctx` in
any position but first; `context.Background()` or `context.TODO()` in code
that has a context in scope.

**Don't flag:** `main` and other entry points that create the first context;
a constructor that uses its context only for setup before it returns, such
as dialing; tests that start from `t.Context()` (Go 1.24+);
`context.WithoutCancel(ctx)` (Go 1.21+) for work that must outlive the
request on purpose; a type that must carry a context through an interface
whose methods can't take one, as `http.Request` does.

**Bad:**

```go
type Syncer struct {
	ctx    context.Context
	client *Client
}

func (s *Syncer) Sync(id string) error { return s.client.Push(s.ctx, id) }
```

**Good:**

```go
type Syncer struct {
	client *Client
}

func (s *Syncer) Sync(ctx context.Context, id string) error { return s.client.Push(ctx, id) }
```
