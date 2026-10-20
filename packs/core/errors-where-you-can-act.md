---
id: core/errors-where-you-can-act
title: Handle an error once, where something can be done about it
applies: ["**/*"]
severity: should-fix
stage: diff
status: draft
source: Dave Cheney, "Don't just check errors, handle them gracefully" (2016), https://dave.cheney.net/2016/04/27/dont-just-check-errors-handle-them-gracefully; Go Proverbs, "Don't just check errors, handle them gracefully"
quote: "Lastly, I want to mention that you should only handle errors once. Handling an error means inspecting the error value, and making a decision."
added: 2026-10-19
---

Handle an error at the layer that can decide what to do: retry, fail the
request, show the user. Everywhere else, add context and pass it up. Don't log
an error and then return or rethrow it as well.

**Why:** An error logged at every layer shows up in the logs once per layer,
and each layer grows a log line or a try/catch that still decides nothing.

**Flag:** an error logged and then returned or rethrown, including catch blocks
that only log and rethrow.

**Don't flag:** the one layer that handles the error, such as an HTTP handler
writing a 500, a worker loop skipping one item, or `main` exiting; a catch that
adds context and rethrows; a log line where the error goes no further, like a
background job. An error that gets dropped is `core/dont-hide-failures`.

**Bad:**

```go
func (s *Syncer) Sync(ctx context.Context, id string) error {
	if err := s.client.Push(ctx, id); err != nil {
		log.Printf("push %s failed: %v", id, err)
		return err
	}
	return nil
}
```

**Good:**

```go
func (s *Syncer) Sync(ctx context.Context, id string) error {
	if err := s.client.Push(ctx, id); err != nil {
		return fmt.Errorf("push %s: %w", id, err)
	}
	return nil
}
```
