---
id: go/getters-no-get
title: Name getters without Get
applies: ["**/*.go"]
severity: nit
stage: diff
source: https://google.github.io/styleguide/go/decisions#getters; Google Go Style Guide, Decisions, "Getters"; Effective Go, "Getters"
quote: 'Function and method names should not use a Get or get prefix, unless the underlying concept uses the word "get" (e.g. an HTTP GET).'
added: 2026-10-19
---

Name a getter after what it returns: `Owner()`, not `GetOwner()`. A setter,
if there is one, is `SetOwner`.

**Why:** `Get` adds nothing to the name. The case of the first letter already
tells the method `Owner()` apart from the field `owner`.

**Flag:** methods named `GetX()` that return a value without doing a lookup
or a request.

**Don't flag:** `Get` as the real verb of a lookup (`http.Get`, a cache's
`Get`); generated code such as protobuf accessors; methods an interface
requires, such as `GetName()` on Kubernetes objects.

**Bad:**

```go
func (r *Rule) GetOwner() string { return r.owner }
```

**Good:**

```go
func (r *Rule) Owner() string { return r.owner }
```
