---
id: java/fix-generics
title: Fix the generic types instead of silencing the warning
applies: ["**/*.java"]
severity: should-fix
stage: diff
source: The Java Tutorials, "Generics", "Raw Types", https://docs.oracle.com/javase/tutorial/java/generics/rawTypes.html; JDK 25 API, java.lang.SuppressWarnings (use it "on the most deeply nested element where it is effective")
quote: "The warning shows that raw types bypass generic type checks, deferring the catch of unsafe code to runtime. Therefore, you should avoid using raw types."
added: 2026-10-19
---

Give generic types their type arguments: `List<String>`, `Class<?>`,
`Map<String, List<Rule>>`, never a bare `List`, `Map` or `Class`. When the
compiler warns about an unchecked conversion, fix the types first: a wildcard,
a type parameter, a typed field. If one cast truly can't be checked, put
`@SuppressWarnings("unchecked")` on the smallest thing that needs it, the local
variable or the one method, not the class.

**Why:** Raw types and broad suppressions move type errors from the compiler
to a `ClassCastException` at run time, somewhere else. A suppression on a
class also hides every new warning anyone adds to that class later.

**Flag:** raw types in new code; `@SuppressWarnings("unchecked")` or
`"rawtypes"` on a class or a long method; unchecked casts that a wildcard or a
type parameter would remove.

**Don't flag:** one unavoidable unchecked cast (creating a generic array,
deserializing, reflection) with a narrow suppression; class literals like
`List.class`; raw types forced by an old API you call.

**Bad:**

```java
@SuppressWarnings("unchecked")
public class RuleCache {
    private final Map cache = new HashMap();

    public List<Rule> rules(String team) {
        return (List<Rule>) cache.get(team);
    }
}
```

**Good:**

```java
public class RuleCache {
    private final Map<String, List<Rule>> cache = new HashMap<>();

    public List<Rule> rules(String team) {
        return cache.get(team);
    }
}
```
