---
id: java/keep-the-cause
title: Pass the caught exception on as the cause
applies: ["**/*.java"]
severity: should-fix
stage: diff
source: Error Prone, "UnusedException", https://errorprone.info/bugpattern/UnusedException; dev.java, "Throwing Exceptions", "Chained Exceptions"
quote: "This catch block catches an exception and re-throws another, but swallows the caught exception rather than setting it as a cause."
added: 2026-10-19
---

When you catch one exception and throw another, pass the caught one to the new
exception's constructor as the cause, as in `new StoreException(message, e)`.
If the type has no such constructor, call `initCause(e)`. Copying
`e.getMessage()` into the new message is not enough. This is how Java does the
"add context and pass it up" of `core/errors-where-you-can-act`.

**Why:** Without the cause, the stack trace stops at the catch block. The real
failure, with its own type, line and library call, is gone, and whoever
debugs it starts from a guess.

**Flag:** a `throw new ...` inside a `catch` that doesn't pass the caught
exception; `new X(e.getMessage())` or `new X(e.toString())`.

**Don't flag:** a `catch` that handles the exception and doesn't rethrow;
translating at a trust boundary where the cause must not reach the client,
with a comment saying so; a caught exception named `unused`, or `_` (Java
22+), which says it is dropped on purpose.

**Bad:**

```java
Rule load(String id) {
    try {
        return jdbc.queryForRule(id);
    } catch (SQLException e) {
        throw new StoreException("cannot load rule " + id + ": " + e.getMessage());
    }
}
```

**Good:**

```java
Rule load(String id) {
    try {
        return jdbc.queryForRule(id);
    } catch (SQLException e) {
        throw new StoreException("cannot load rule " + id, e);
    }
}
```
