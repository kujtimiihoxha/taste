---
id: rust/bounds-on-impls
title: Put trait bounds on impls, not on struct definitions
applies: ["**/*.rs"]
severity: should-fix
stage: diff
status: draft
source: Rust API Guidelines, "Data structures do not duplicate derived trait bounds (C-STRUCT-BOUNDS)", https://rust-lang.github.io/api-guidelines/future-proofing.html
quote: "Generic data structures should not use trait bounds that can be derived or do not otherwise add semantic value."
added: 2026-10-19
---

Leave generic structs and enums unbounded: `struct Cache<K, V>`, not
`struct Cache<K: Hash + Eq + Clone, V: Clone>`. Put each bound on the `impl`
or function that needs it.

**Why:** A bound on the definition has to be repeated on every `impl` and by
every user of the type, even where nothing needs it. Adding one later is a
breaking change, while `#[derive]` already adds bounds only where they apply.

**Flag:** bounds on a struct or enum definition, inline or in a `where`
clause, that no field needs: derivable traits like `Clone`, `Debug`,
`PartialEq`, `Default`, `Hash` or `Serialize`, and auto traits like `Send`
or `Unpin`.

**Don't flag:** a bound the definition really needs: a field that names an
associated type (`I::Item`), `?Sized`, or a `Drop` impl that needs the bound,
which Rust then requires on the struct as well. Also leave alone a
non-derivable bound like `Read` or `Write` that says what the type is for;
the guideline calls that a grey area.

**Bad:**

```rust
#[derive(Clone, Debug)]
pub struct Cache<K: Eq + Hash + Clone, V: Clone> {
    entries: HashMap<K, V>,
}
```

**Good:**

```rust
#[derive(Clone, Debug)]
pub struct Cache<K, V> {
    entries: HashMap<K, V>,
}
```
