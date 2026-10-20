---
id: go/useful-zero-value
title: Make the zero value useful
applies: ["**/*.go"]
severity: should-fix
stage: diff
source: https://go.dev/doc/effective_go#allocation_new; Effective Go, "Allocation with new"; Uber Go Style Guide, "Zero-value Mutexes are Valid"
quote: "Since the memory returned by new is zeroed, it's helpful to arrange when designing your data structures that the zero value of each type can be used without further initialization."
added: 2026-10-19
---

Design types so `var x T` is ready to use, the way `bytes.Buffer` and
`sync.Mutex` are. Hold a mutex by value, let a zero setting mean "use the
default", and skip constructors that only fill in what the zero value would
give you.

**Why:** a type that works at its zero value needs no constructor, no "not
initialized" checks and no rules about how it must be built.

**Flag:** constructors that only allocate a mutex or empty fields; pointer
fields such as `*sync.Mutex` that force a constructor; pointer fields such as
`*time.Duration` that only mean "not set" where zero could mean "use the
default"; "not initialized" errors that a usable zero value would remove.

**Don't flag:** types that need real setup (a connection, required
dependencies); settings where zero would be dangerous (a zero timeout that
means "wait forever"); optional fields in JSON or protobuf types, where zero
and "not set" mean different things.

**Bad:**

```go
type Stats struct {
	mu    *sync.Mutex
	count int
}

func NewStats() *Stats { return &Stats{mu: &sync.Mutex{}} }
```

**Good:**

```go
type Stats struct {
	mu    sync.Mutex
	count int
}
```
