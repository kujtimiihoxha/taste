---
id: rust/borrow-dont-clone
title: Don't clone to get past the borrow checker
applies: ["**/*.rs"]
severity: should-fix
stage: diff
source: Rust Design Patterns, "Clone to satisfy the borrow checker", https://rust-unofficial.github.io/patterns/anti_patterns/borrow_clone.html
quote: "If a clone is used to make a borrow checker error disappear, that's a good indication this anti-pattern may be in use."
added: 2026-10-19
---

When the borrow checker rejects code, change its shape instead of adding
`.clone()`. Borrow the value, move it if nothing uses it afterwards, or take
it out from behind a `&mut` with `std::mem::take`.

**Why:** A clone copies the data, and the copy no longer follows the
original: a change to one doesn't show up in the other. The borrow error
usually points at a simpler fix, and the copy costs time and memory on every
call.

**Flag:**

- `.clone()` of a value that is only read afterwards, or passed to a function
  that takes `&T`.
- Cloning fields out of a value that is dropped right after; move or
  destructure it instead.
- Cloning a field behind `&mut` only to replace it; use `mem::take` or
  `mem::replace`.
- Getters that clone a field (`fn name(&self) -> String`) so they don't have
  to return a reference.
- Cloning a whole collection only to loop over it.

**Don't flag:** clones of `Rc` and `Arc`, which share instead of copying;
`Copy` types; a copy that has to live on its own, like a value moved into a
spawned task or thread; a clone in code that isn't hot, when avoiding it would
take lifetimes or a restructure much bigger than the clone.

**Bad:**

```rust
// enum Upload { Pending { chunks: Vec<Chunk> }, Sent { chunks: Vec<Chunk> } }
fn mark_sent(upload: &mut Upload) {
    if let Upload::Pending { chunks } = upload {
        *upload = Upload::Sent { chunks: chunks.clone() };
    }
}
```

**Good:**

```rust
// enum Upload { Pending { chunks: Vec<Chunk> }, Sent { chunks: Vec<Chunk> } }
fn mark_sent(upload: &mut Upload) {
    if let Upload::Pending { chunks } = upload {
        *upload = Upload::Sent { chunks: std::mem::take(chunks) };
    }
}
```
