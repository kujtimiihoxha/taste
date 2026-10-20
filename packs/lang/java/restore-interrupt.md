---
id: java/restore-interrupt
title: Don't swallow InterruptedException
applies: ["**/*.java"]
severity: must-fix
stage: diff
status: draft
source: Brian Goetz, "Java theory and practice: Dealing with InterruptedException", IBM developerWorks (2006), https://web.archive.org/web/20201025132525/https://www.ibm.com/developerworks/library/j-jtp05236/index.html; Goetz et al., "Java Concurrency in Practice" (2006), 7.1.3; the JDK 25 ExecutorService docs still show the same idiom ("Preserve interrupt status")
quote: "At the very least, whenever you catch InterruptedException and don't rethrow it, reinterrupt the current thread before returning."
added: 2026-10-19
---

If a method can let `InterruptedException` through, declare it and let it go.
If it can't (a `Runnable`, a callback, an interface method without `throws`),
catch it, call `Thread.currentThread().interrupt()` to restore the interrupt
flag, and stop the work. Logging it, ignoring it, or wrapping it in another
exception without restoring the flag all lose the interrupt.

**Why:** Interrupts are how Java cancels work: `ExecutorService.shutdownNow()`
and `Future.cancel(true)` rely on them. Throwing `InterruptedException` clears
the thread's interrupt flag, so if the catch doesn't set it again, the code
that asked for the stop never finds out, and shutdown hangs.

**Flag:** a `catch (InterruptedException e)` that only logs, is empty, or
throws another exception without calling `Thread.currentThread().interrupt()`;
a loop that catches it and keeps going; `catch (Exception e)` around a call
that can throw it, with neither a rethrow nor the flag restored.

**Don't flag:** code that rethrows `InterruptedException`; the `run` method of
a thread your code started and owns, when it exits right after the catch;
tests.

**Bad:**

```java
public void run() {
    while (running) {
        try {
            process(queue.take());
        } catch (InterruptedException e) {
            log.warn("interrupted while waiting for work", e);
        }
    }
}
```

**Good:**

```java
public void run() {
    while (running) {
        try {
            process(queue.take());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return;
        }
    }
}
```
