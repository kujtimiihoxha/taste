---
id: java/narrow-access
title: Use the narrowest access that works
applies: ["**/*.java"]
severity: should-fix
stage: diff
status: draft
source: dev.java, "More on Classes", "Tips on Choosing an Access Level", https://dev.java/learn/language/oop/classes-objects/more-on-classes/
quote: "Use the most restrictive access level that makes sense for a particular member. Use private unless you have a good reason not to."
added: 2026-10-19
---

Give each class, constructor, method and field the narrowest access that
works: `private` first, then package-private (no modifier), and `public` only
for what code in other packages calls. Tests sit in the same package, so they
can call package-private code when testing it meets
`tests/test-behavior-not-implementation`. Don't make something public, or
reach for reflection, just so a test can use it. Fields are never public, except
constants.

**Why:** Everything public becomes API. Other code starts to depend on it, and
it can't be changed or removed without finding every caller. In a library it
can't be taken back at all.

**Flag:** new `public` classes, methods or constructors that nothing outside
the package uses; `public` or reflection added only for a test; `public` or
`protected` mutable fields; `protected` members in a class that nothing
extends.

**Don't flag:** methods that implement an interface or override a public
method, which must stay public; the type's real API; members a framework needs
to see (JUnit 4 test methods, some serialization and injection frameworks);
`public static final` constants that other packages use.

**Bad:**

```java
public class OffsetStore {
    public final Map<String, Long> offsets = new HashMap<>();

    public long offset(String topic) {
        return offsets.getOrDefault(topic, 0L);
    }

    // Only the recovery worker, in the same package, calls this.
    public void reset() {
        offsets.clear();
    }
}
```

**Good:**

```java
public class OffsetStore {
    private final Map<String, Long> offsets = new HashMap<>();

    public long offset(String topic) {
        return offsets.getOrDefault(topic, 0L);
    }

    // Only the recovery worker, in the same package, calls this.
    void reset() {
        offsets.clear();
    }
}
```
