---
id: java/specific-exceptions
title: Throw and catch specific exception types
applies: ["**/*.java"]
severity: should-fix
stage: diff
status: draft
source: Error Prone, "ThrowSpecificExceptions", https://errorprone.info/bugpattern/ThrowSpecificExceptions; Brian Goetz on catching Exception, https://stackoverflow.com/a/23861634 (2014)
quote: "Base exception classes should be treated as abstract. If the exception is intended to be caught, throw a domain-specific exception. Otherwise, prefer a more specific exception for clarity."
added: 2026-10-19
---

Don't throw `RuntimeException`, `Exception` or `Throwable` themselves. Throw
the type that says what went wrong: `IllegalArgumentException` for a bad
argument, `IllegalStateException` for a call at the wrong time,
`UncheckedIOException` to carry an `IOException` through a lambda, or the
exception type the codebase already uses. Declare the checked exceptions a
method really throws, not `throws Exception`. Catch the types the `try` block
can throw (a multi-catch is fine), not `Exception`. This is the Java side of
`core/dont-hide-failures`.

**Why:** A caller can't catch a bare `RuntimeException` without also catching
every bug, like `NullPointerException`. `catch (Exception e)` has the same
problem from the other side: it also catches those bugs and
`InterruptedException`, and treats them as the failure it expected.

**Flag:** `throw new RuntimeException(...)` or `throw new Exception(...)`;
`throws Exception` on a non-test method; `catch (Exception e)` or
`catch (Throwable t)` around calls that throw one or two known checked
exceptions; a checked exception wrapped in `RuntimeException` only to avoid a
`throws` clause the callers could handle.

**Don't flag:** the one top-level place that must catch everything (`main`, a
worker loop, a request dispatcher that turns any failure into an error
response); test methods that declare `throws Exception`; overriding a method
that already declares `throws Exception`, like `AutoCloseable.close` or
`Callable.call`; a `catch` that rethrows the same exception unchanged.

**Bad:**

```java
Config load(Path path) {
    try {
        return Config.parse(Files.readString(path));
    } catch (Exception e) {
        throw new RuntimeException("cannot load config " + path, e);
    }
}
```

**Good:**

```java
Config load(Path path) throws IOException {
    return Config.parse(Files.readString(path));
}
```
