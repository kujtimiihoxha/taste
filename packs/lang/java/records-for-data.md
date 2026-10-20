---
id: java/records-for-data
title: Use a record for a class that only carries data
applies: ["**/*.java"]
severity: should-fix
stage: both
source: JEP 395, "Records", "Motivation", https://openjdk.org/jeps/395; dev.java, "Using Records to Model Immutable Data"
quote: "Properly writing such a data-carrier class involves a lot of low-value, repetitive, error-prone code: constructors, accessors, equals, hashCode, toString, etc."
added: 2026-10-19
---

On Java 16+, write a class whose job is to hold a few values (a request or a
response, a key, an event, a result) as a record. The component list gives you
the constructor, the accessors, `equals`, `hashCode` and `toString`, and they
stay right when a component is added. Put validation in a compact constructor.
Don't hand-write that boilerplate.

**Why:** Hand-written `equals` and `hashCode` drift: someone adds a field and
misses one of them, and map lookups or test assertions quietly go wrong. A
record also says in one line that the class is just data.

**Flag:** new classes with only final fields, a constructor that assigns them,
accessors, and `equals`/`hashCode`/`toString`; an `equals` or `hashCode` on
such a class that misses a field.

**Don't flag:** code that must build on Java 15 or older; a codebase that
writes its data classes with Lombok (`core/one-way-to-do-it`); JPA entities and
other framework classes that need a no-argument constructor, setters or a
superclass; classes with mutable state, or with behavior that doesn't come
from their fields (a service or a validator is not a record just because its
fields are final); types that hide their fields behind an API, since a record
exposes every component.

**Bad:**

```java
public final class Endpoint {
    private final String host;
    private final int port;

    public Endpoint(String host, int port) {
        this.host = host;
        this.port = port;
    }

    public String host() {
        return host;
    }

    public int port() {
        return port;
    }

    @Override
    public boolean equals(Object o) {
        return o instanceof Endpoint other && host.equals(other.host) && port == other.port;
    }

    @Override
    public int hashCode() {
        return Objects.hash(host, port);
    }
}
```

**Good:**

```java
public record Endpoint(String host, int port) {}
```
