---
id: tests/no-sleeps
title: Wait on signals, never on sleeps
applies: tests
severity: should-fix
stage: diff
status: draft
source: https://martinfowler.com/articles/nonDeterminism.html#AsynchronousBehavior, Martin Fowler, "Eradicating Non-Determinism in Tests" (2011), "Asynchronous Behavior"
quote: "Never use bare sleeps to wait for asynchonous responses: use a callback or polling."
added: 2026-10-19
---

Don't sleep to wait for background work. Wait on a signal the code gives: a
returned promise, a channel, a callback, a `Wait` or `Drain` method. When there
is no signal, poll for the result with a short interval and a generous time
limit.

**Why:** A sleep is either too short, and the test fails on a busy machine, or
too long, and every run pays for it. Flaky tests teach people to ignore red.

**Flag:** `time.Sleep`, `setTimeout`, `time.sleep` or `asyncio.sleep` used to
wait for work to finish, a server to stop or state to settle before the test
goes on.

**Don't flag:** polling with a time limit (`waitFor`, `Eventually`,
`wait.PollUntilContextTimeout`); a generous timeout used only as a safety net
around a wait on a signal; "sleeping" on a fake clock. A sleep that waits for a
timer the code sets, such as a TTL or a retry delay, is `tests/fake-the-clock`.

**Bad:**

```go
func TestWorkerProcessesJob(t *testing.T) {
	q := NewQueue()
	StartWorker(q)
	job := q.Push("resize")
	time.Sleep(100 * time.Millisecond)
	if !job.Done() {
		t.Fatal("job not done")
	}
}
```

**Good:**

```go
func TestWorkerProcessesJob(t *testing.T) {
	q := NewQueue()
	w := StartWorker(q)
	job := q.Push("resize")
	w.Drain() // returns after all previously submitted jobs have finished
	if !job.Done() {
		t.Fatal("job not done")
	}
}
```
