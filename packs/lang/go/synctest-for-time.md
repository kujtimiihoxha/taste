---
id: go/synctest-for-time
title: Test timers and timeouts with testing/synctest
applies: ["**/*.go"]
severity: should-fix
stage: both
status: draft
source: https://go.dev/blog/testing-time; The Go Blog, "Testing Time (and other asynchronicities)" (Damien Neil, 2025); package testing/synctest documentation
quote: 'And now, in Go 1.25, we''ve released the testing/synctest package as part of the standard library. It lets you run a function in what we''re calling a "bubble". Within the bubble, the time package uses a fake clock, and the synctest package provides a function to wait for the bubble to quiesce.'
added: 2026-10-20
---

This is the Go form of `tests/fake-the-clock` and `tests/no-sleeps`. In Go
1.25+, a test of code that sleeps, uses timers or tickers, or times out runs
its body in `synctest.Test`. Inside it, `time` uses a fake clock that jumps
ahead when every goroutine is waiting, and `synctest.Wait()` waits for
background goroutines to settle. Don't sleep for real, and don't add a clock
interface just so tests can control time.

**Why:** real sleeps make a test slow or flaky. A clock interface adds a
type, a field and a fake that production code doesn't need, and it can't
reach the timers inside other packages.

**Flag:** a test of timers or timeouts that waits on real time instead of
running in `synctest.Test`; a new `Clock` interface or `now func() time.Time`
field that exists only so tests can swap the clock.

**Don't flag:** modules on a Go version before 1.25; a function that takes
the time as an argument, as in the `tests/fake-the-clock` example; tests
that wait on real network I/O or other work outside the bubble, which the
fake clock can't speed up; a clock library the repo already uses throughout,
such as `k8s.io/utils/clock`; `time.Sleep` inside a bubble, which sleeps on
the fake clock.

**Bad:**

```go
func TestCacheExpires(t *testing.T) {
	c := NewCache(time.Second)
	c.Set("cpu", 1)
	time.Sleep(1100 * time.Millisecond)
	if _, ok := c.Get("cpu"); ok {
		t.Fatal("entry did not expire")
	}
}
```

**Good:**

```go
func TestCacheExpires(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		c := NewCache(time.Second)
		c.Set("cpu", 1)
		time.Sleep(2 * time.Second)
		if _, ok := c.Get("cpu"); ok {
			t.Fatal("entry did not expire")
		}
	})
}
```
