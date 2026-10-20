---
id: go/consumer-interfaces
title: Interfaces belong to the code that uses them
applies: ["**/*.go"]
severity: should-fix
stage: both
status: draft
source: https://go.dev/wiki/CodeReviewComments#interfaces; Go Code Review Comments, "Interfaces"; Google Go Style Guide, Decisions, "Interfaces"
quote: "Go interfaces generally belong in the package that uses values of the interface type, not the package that implements those values. The implementing package should return concrete (usually pointer or struct) types: that way, new methods can be added to implementations without requiring extensive refactoring."
added: 2026-10-19
---

This is the Go form of `core/no-single-use-abstraction`. The package that
implements something exports the concrete type and returns it from `New`.
The package that uses it declares a small interface with only the methods it
calls, and only when it needs one: a second real implementation, or a
boundary it does not own.

**Why:** Go interfaces are satisfied implicitly, so a consumer can add one
later without touching the producer. An interface next to its only
implementation is a second thing to read and change, and returning it hides
every method the interface leaves out.

**Flag:**

- An interface declared in the package that implements it, for its
  consumers to use. One added there only so tests can mock it is
  `tests/real-then-fake-then-mock`.
- A `New...` function that returns an interface instead of the concrete type.
- `fooImpl` or `FooImpl` types paired with a `Foo` interface.
- An interface a consumer declares with more methods than it calls.

**Don't flag:** interfaces with several real implementations (`io.Reader`);
an interface that is the product itself, such as a plugin API others
implement; a constructor that returns an interface on purpose to keep the
type private, as functions returning `error` do.

**Bad:**

```go
type UserStore interface {
	User(ctx context.Context, id string) (*User, error)
	SaveUser(ctx context.Context, u *User) error
}

type userStoreImpl struct{ db *sql.DB }

func NewUserStore(db *sql.DB) UserStore { return &userStoreImpl{db: db} }
```

**Good:**

```go
type UserStore struct{ db *sql.DB }

func NewUserStore(db *sql.DB) *UserStore { return &UserStore{db: db} }
```
