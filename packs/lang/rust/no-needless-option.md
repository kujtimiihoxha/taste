---
id: rust/no-needless-option
title: Don't wrap a value in Option when it's always there
applies: ["**/*.rs"]
severity: should-fix
stage: both
source: The Rust Programming Language, ch. 9.3 "To panic! or Not to panic!", https://doc.rust-lang.org/book/ch09-03-to-panic-or-not-to-panic.html
quote: "For example, if you have a type rather than an Option, your program expects to have something rather than nothing."
added: 2026-10-19
---

This is how `core/new-check-needs-a-real-input` plays out in Rust's types. A field that is always set is `T`, not `Option<T>`.
A list that may be empty is `Vec<T>`, not `Option<Vec<T>>`. Let the type say
the value is there.

**Why:** Every `Option` makes each caller handle a `None` that can't happen,
usually with an `unwrap` that will hide the next real bug. With the plain
type, the compiler proves the value is there.

**Flag:** `Option` fields that the constructor always fills, then
`.unwrap()` at each use; `Option` returns from functions that never return
`None`; `Option<Vec<T>>` or `Option<String>` where `None` and empty mean the
same thing; `Option` parameters that every caller passes as `Some`.

**Don't flag:** values that really can be missing; public traits and APIs
that keep an `Option` so other implementations or later versions can return
`None`; `Option` fields filled in after construction, like a connection
opened on first use.

**Bad:**

```rust
pub struct Job {
    id: Option<u64>,
}

impl Job {
    pub fn new(id: u64) -> Self {
        Job { id: Some(id) }
    }

    pub fn id(&self) -> u64 {
        self.id.unwrap()
    }
}
```

**Good:**

```rust
pub struct Job {
    id: u64,
}

impl Job {
    pub fn new(id: u64) -> Self {
        Job { id }
    }

    pub fn id(&self) -> u64 {
        self.id
    }
}
```
