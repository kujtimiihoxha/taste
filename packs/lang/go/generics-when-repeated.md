---
id: go/generics-when-repeated
title: Use generics for code that is really repeated, not "in case"
applies: ["**/*.go"]
severity: should-fix
stage: both
source: https://go.dev/blog/when-generics; The Go Blog, "When To Use Generics" (Ian Lance Taylor, 2022); Google Go Style Guide, Decisions, "Generics"
quote: "Another way to say this is that you should avoid type parameters until you notice that you are about to write the exact same code multiple times."
added: 2026-10-19
---

This is the Go form of `core/no-single-use-abstraction`. Write the plain
version first. Use type parameters when you would otherwise write the same
code for several types, such as a container or a helper over any slice.
Don't make a type, function or method (methods can have type parameters
since Go 1.27) generic when it is used with one type, and use an interface
when all you need is to call a method.

**Why:** type parameters make signatures and errors harder to read. With one
real type they buy nothing, and they are easy to add once a second type
shows up.

**Flag:** generic types, functions or methods instantiated with only one
type; type parameters used only to call a method, as in
`func Read[T io.Reader](r T)`; generic "repository" or "service" layers.

**Don't flag:** small helpers over any slice or map, the way the `slices` and
`maps` packages work; containers used with several types; code that already
has copies that differ only in their types.

**Bad:**

```go
type Cache[K comparable, V any] struct {
	items map[K]V
}

var rules Cache[string, Rule] // the only instantiation
```

**Good:**

```go
type RuleCache struct {
	items map[string]Rule
}
```
