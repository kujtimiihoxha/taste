---
id: go/no-init-globals
title: No mutable package-level state or init() setup; pass dependencies in
applies: ["**/*.go"]
severity: should-fix
stage: both
source: https://github.com/uber-go/guide/blob/master/style.md#avoid-mutable-globals; Uber Go Style Guide, "Avoid Mutable Globals" and "Avoid init()"; Google Go Style Guide, Best Practices, "Global state"
quote: "Avoid mutating global variables, instead opting for dependency injection. This applies to function pointers as well as other kinds of values."
added: 2026-10-19
---

Give a type what it needs through its constructor. Don't keep clients,
config or caches in package-level variables, and don't set them up in
`init()`. `main` builds the pieces and wires them together.

**Why:** hidden globals make code depend on load order, hard to test and
impossible to run twice in one process. Tests that swap a global can't run in
parallel. A constructor's arguments show what a type depends on.

**Flag:** package-level variables holding mutable state (clients, caches,
config); `init()` that reads the environment, opens files or connections, or
starts goroutines; package-level function variables that tests swap (for
`time.Now`, see `go/synctest-for-time`).

**Don't flag:** constants, lookup tables, `regexp.MustCompile` of a literal,
sentinel errors; registration a library requires (`database/sql` drivers,
`image` formats); the process-wide registries a project already uses, such
as its default metrics registry or flag set.

**Bad:**

```go
var db *sql.DB

func init() {
	db = openDB(os.Getenv("DATABASE_URL"))
}

func Rules(ctx context.Context) ([]Rule, error) { return queryRules(ctx, db) }
```

**Good:**

```go
type Store struct {
	db *sql.DB
}

func (s *Store) Rules(ctx context.Context) ([]Rule, error) { return queryRules(ctx, s.db) }
```
