---
id: java/exhaustive-switch
title: Switch over enums and sealed types without a default
applies: ["**/*.java"]
severity: should-fix
stage: diff
status: draft
source: JEP 441, "Pattern Matching for switch", "Exhaustiveness in practice", https://openjdk.org/jeps/441; JEP 409, "Sealed Classes"
quote: "Manually writing a default clause in this situation is not only irritating but actually pernicious, since the compiler can do a better job of checking exhaustiveness without one."
added: 2026-10-19
---

When code picks between the constants of an enum or the subtypes of a sealed
type, write a switch that names every case and has no `default`. On an enum it
has to be a switch expression (Java 14+): plain switch statements on enums are
not checked. A pattern switch over a sealed type (Java 21) is checked even as a
statement. The compiler then makes sure every case is covered, so a new
constant or subtype is a compile error at each switch that misses it. An
if-else or `instanceof` chain over the cases gets no check at all.

**Why:** A `default` that throws turns "you forgot the new case" from a
compile error into an exception in production. A `default` that returns a
value hides it for good. Without one, a value that shows up at run time
without a recompile still throws a `MatchException`.

**Flag:** `default -> throw ...` or `default:` in a switch expression or a
pattern switch that already names every constant of an enum or every
permitted subtype of a sealed type; if-else or `instanceof` chains that pick
among the constants of an enum or the subtypes of a sealed type.

**Don't flag:** a `default` in a switch statement over an enum: javac doesn't
check those, so removing it only removes the guard; enums from another library
or service that can gain values without your code being recompiled (keep the
default and say why); switches on `int`, `String` or open class hierarchies,
which need a default; code that must build on Java 13 or older, which has no
switch expressions.

**Bad:**

```java
String label(Status status) {
    return switch (status) {
        case ACTIVE -> "on";
        case PAUSED -> "paused";
        case STOPPED -> "off";
        default -> throw new IllegalStateException("unknown status " + status);
    };
}
```

**Good:**

```java
String label(Status status) {
    return switch (status) {
        case ACTIVE -> "on";
        case PAUSED -> "paused";
        case STOPPED -> "off";
    };
}
```
