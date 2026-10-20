---
id: go/goroutine-owner
title: Every goroutine has an owner and a way to stop
applies: ["**/*.go"]
severity: must-fix
stage: both
source: https://go.dev/wiki/CodeReviewComments#goroutine-lifetimes; Go Code Review Comments, "Goroutine Lifetimes"; Uber Go Style Guide, "Don't fire-and-forget goroutines"
quote: "When you spawn goroutines, make it clear when - or whether - they exit. Goroutines can leak by blocking on channel sends or receives: the garbage collector will not terminate a goroutine even if the channels it is blocked on are unreachable."
added: 2026-10-19
---

When code starts a goroutine, make it clear who waits for it and what stops
it: a context, a closed channel or the end of its input.

**Why:** a goroutine that can't stop leaks. It holds its memory and keeps
working after its request is gone, and one that leaks per call grows until
the process runs out of memory.

**Flag:**

- A goroutine with no bounded completion or cancellation path, such as a
  loop that can wait forever on input that will never arrive.
- Goroutines that send on a channel nobody reads once the caller returns
  early, for example on the first error.
- Library code that starts a goroutine and gives the caller no way to stop
  it or wait for it.

**Don't flag:** goroutines that live as long as the process, started from
`main`; finite work or a loop whose input is guaranteed to end.
`errgroup` and `sync.WaitGroup` coordinate waiting, but the work must still
have a way to finish (`wg.Go`, Go 1.25+, does `Add` and `Done` for you).
Concurrency added solely for speed also needs `core/speed-needs-evidence`.

**Bad:**

```go
func (w *Watcher) Start() {
	go func() {
		for {
			w.poll()
			time.Sleep(w.every)
		}
	}()
}
```

**Good:**

```go
func (w *Watcher) Run(ctx context.Context) {
	for {
		w.poll()
		select {
		case <-ctx.Done():
			return
		case <-time.After(w.every):
		}
	}
}
```
