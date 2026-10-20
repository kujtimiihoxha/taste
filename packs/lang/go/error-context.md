---
id: go/error-context
title: Wrap errors with %w and what this layer knows; don't swap in a sentinel
applies: ["**/*.go"]
severity: should-fix
stage: diff
source: https://github.com/uber-go/guide/blob/master/style.md#error-wrapping; Uber Go Style Guide, "Error Wrapping" and "Error Types"; The Go Blog, "Working with Errors in Go 1.13" (2019)
quote: "Use fmt.Errorf to add context to your errors, picking between the %w or %v verbs based on whether the caller should be able to match and extract the underlying cause."
added: 2026-10-19
---

This is the Go form of "add context and pass it up" from
`core/errors-where-you-can-act`. Add what this layer knows and the caller
doesn't (what it was doing, which ID) and keep the cause with `%w`. Callers
check the cause with `errors.Is` and `errors.As` (or `errors.AsType`, Go
1.26+), which see through the wrapping; `==` and type assertions don't. Add a sentinel (`ErrNotFound`) or an
error type only when a caller needs to tell that case apart.

**Why:** a sentinel or a new string in place of the cause throws away the
real reason, and `%v` hides it from `errors.Is`. Error types nobody checks
are extra code.

**Flag:** returning a sentinel or a new error in place of the underlying one;
`%v` or `err.Error()` where callers may need the cause; `err == ErrX` or
`err.(*T)` on errors that may be wrapped; new sentinels or error types that
no caller checks.

**Don't flag:** a bare `return err` when this layer has nothing to add; `%v`
at an API boundary that hides internals on purpose; sentinels that are part
of a public API; how the message is worded, such as a "failed to" prefix,
which projects choose for themselves; case and final punctuation of error
strings, which staticcheck's ST1005 already reports.

**Bad:**

```go
var ErrReadConfig = errors.New("cannot read config")

func readConfig(path string) ([]byte, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, ErrReadConfig
	}
	return b, nil
}
```

**Good:**

```go
func readConfig(path string) ([]byte, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read config: %w", err)
	}
	return b, nil
}
```
