---
id: java/atomic-compound-updates
title: Make check-then-act on shared state one atomic step
applies: ["**/*.java"]
severity: must-fix
stage: diff
status: draft
source: JDK 27 API, java.util.concurrent.ConcurrentHashMap, putIfAbsent, https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html; Error Prone, "NonAtomicVolatileUpdate" (count++ on a volatile field is not atomic)
quote: "This is equivalent to, for this map: if (!map.containsKey(key)) return map.put(key, value); else return map.get(key); except that the action is performed atomically."
added: 2026-10-19
---

A concurrent collection or a `volatile` field makes each single call safe, not
a sequence of calls. When code shared between threads reads a value, decides,
and then writes, make it one atomic step: `computeIfAbsent`, `putIfAbsent`,
`compute` or `merge` on a `ConcurrentHashMap`; an `AtomicLong`, `LongAdder` or
`compareAndSet` for counters and flags; or one lock around the whole read and
write. Keep the function you pass to `computeIfAbsent` short: other threads'
updates to the map can block while it runs.

**Why:** Between the check and the write, another thread can make the same
check. Both see "missing" and both create the value, or both read 5 and both
write 6, and an update is lost. These bugs pass every test and show up under
load.

**Flag:** `get` or `containsKey` followed by `put` on a map that several
threads use; `count++` or `total += n` on a `volatile` field; a `volatile`
flag that is checked and then set to run something once; a check outside a
`synchronized` block whose write is inside it.

**Don't flag:** updates already reported by configured tools, such as Error
Prone's default `NonAtomicVolatileUpdate`; maps and fields that only one thread touches (there
`computeIfAbsent` is just tidier); a sequence that already runs under one
lock; a `volatile` field with a single writer. Don't ask to replace a correct
`synchronized` method with atomics or a concurrent map: that's a speed change
and needs evidence (`core/speed-needs-evidence`).

**Bad:**

```java
private final ConcurrentHashMap<String, Session> sessions = new ConcurrentHashMap<>();

Session session(String user) {
    Session s = sessions.get(user);
    if (s == null) {
        s = new Session(user);
        sessions.put(user, s);
    }
    return s;
}
```

**Good:**

```java
private final ConcurrentHashMap<String, Session> sessions = new ConcurrentHashMap<>();

Session session(String user) {
    return sessions.computeIfAbsent(user, Session::new);
}
```
