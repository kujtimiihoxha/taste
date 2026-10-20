---
id: java/optional-methods
title: Unwrap an Optional with its own methods
applies: ["**/*.java"]
severity: should-fix
stage: diff
status: draft
source: Brian Goetz (Java language architect), Stack Overflow answer on Optional (2014, updated for Java 10), https://api.stackexchange.com/2.3/answers/26328555?site=stackoverflow&filter=withbody (the answer at https://stackoverflow.com/a/26328555, read through the API because stackoverflow.com blocks scripts); dev.java, "Using Optionals", Rules #1 and #2
quote: "never call Optional.get, unless you can prove it will never be null; instead, use one of the safe methods, like orElse or ifPresent."
added: 2026-10-19
---

Get the value out of an `Optional` with `map`, `orElse`, `orElseGet`,
`orElseThrow` or `ifPresent`. Don't test `isPresent()` and then call `get()`,
and never call `get()` where the Optional might be empty. When empty really is
a bug, `orElseThrow()` (Java 10+) says so plainly, or give it an exception
with a message. A variable or return value of type `Optional` is never `null`:
use `Optional.empty()`.

**Why:** `isPresent()` then `get()` is a null check with extra steps, and it's
one edit away from a `get()` with no check, which throws
`NoSuchElementException` far from the reason the value was missing. A `null`
Optional brings back the `NullPointerException` the type was meant to remove.

**Flag:** `if (opt.isPresent()) { ... opt.get() ... }` where `map`, `orElse` or
`ifPresent` would do; `get()` with no check; `return null` from a method that
returns `Optional`; `opt == null` or `opt != null`.

**Don't flag:** a rewrite that changes nullable mapping or fallback behavior;
a presence test whose branch throws a checked exception or
does several unrelated steps, where a lambda can't or reads worse; `get()` in
a test right after asserting the value is present.

**Bad:**

```java
String emailOf(String id) {
    Optional<String> email = users.emailById(id);
    if (email.isPresent()) {
        return email.get();
    }
    return "unknown";
}
```

**Good:**

```java
String emailOf(String id) {
    return users.emailById(id).orElse("unknown");
}
```
