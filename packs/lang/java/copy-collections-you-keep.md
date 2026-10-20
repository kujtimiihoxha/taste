---
id: java/copy-collections-you-keep
title: Keep your own copy of a collection you're given
applies: ["**/*.java"]
severity: should-fix
stage: diff
status: draft
source: The Java Tutorials, "A Strategy for Defining Immutable Objects", https://docs.oracle.com/javase/tutorial/essential/concurrency/imstrat.html; dev.java, "Using Records to Model Immutable Data" (defensive copies of record components)
quote: "Never store references to external, mutable objects passed to the constructor; if necessary, create copies, and store references to the copies."
added: 2026-10-19
---

When a record or an immutable class takes a `List`, `Set` or `Map` from its
caller, store `List.copyOf(...)`, `Set.copyOf(...)` or `Map.copyOf(...)`
(Java 10+), not the caller's object. The copy can't be changed, so the
accessor can return it as is. A record doesn't copy for you: do it in the
compact constructor. `Collections.unmodifiableList(list)` is not a copy. It's a
read-only view, and whoever holds `list` can still change it.

**Why:** If you keep the caller's list, the caller's next `add` changes your
"immutable" object. Equality, map keys and thread safety break, far from the
line that did it. Handing out your own mutable list does the same in the other
direction.

**Flag:** a record component, or a final field of an immutable class, set
straight from a collection parameter; a getter that returns a mutable
collection field; `Collections.unmodifiableList(param)` stored as if it were a
copy.

**Don't flag:** classes that own a changing collection on purpose (a builder,
a buffer, a cache); private code that builds the collection itself and never
lets a reference out; collections that may hold `null`, which `List.copyOf`
rejects (copy into a new `ArrayList` and wrap it instead); a measured hot path
where the docs say the caller hands the collection over.

**Bad:**

```java
public record Route(String name, List<String> stops) {}
```

**Good:**

```java
public record Route(String name, List<String> stops) {
    public Route {
        stops = List.copyOf(stops);
    }
}
```
