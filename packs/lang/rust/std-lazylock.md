---
id: rust/std-lazylock
title: Use std's LazyLock and OnceLock, not lazy_static or once_cell
applies: ["**/*.rs"]
severity: should-fix
stage: both
status: draft
source: The Rust Release Team, "Announcing Rust 1.80.0", "LazyCell and LazyLock", https://blog.rust-lang.org/2024/07/25/Rust-1.80.0/
quote: "This completes the stabilization of functionality adopted into the standard library from the popular lazy_static and once_cell crates."
added: 2026-10-19
---

This is `core/new-dependency-needs-a-reason` for a common Rust case: the
standard library now does what these crates were added for. Use
`std::sync::LazyLock` for a static built on first use (Rust 1.80+),
`std::sync::OnceLock` for a value set once at run time (1.70+), and a plain
`static` when the initializer is `const`, as `Mutex::new` is (1.63+).

**Why:** A crate and a macro for something std ships is one more dependency
to update and one more way to do the same thing. Code written from older
examples keeps adding them.

**Flag:** new `lazy_static` or `once_cell` entries in `Cargo.toml` when the
crate's minimum Rust version has the std type; `lazy_static!` around
`Mutex::new` or another `const` initializer.

**Don't flag:** crates whose minimum supported Rust is older than the version
above; `no_std` crates; `once_cell` features std doesn't have yet, like
`OnceCell::get_or_try_init` or the `race` module; existing uses; a new lazy
static in a crate that already uses these crates, unless its initializer is
`const` or the change moves them all (`core/one-way-to-do-it`).

**Bad:**

```rust
lazy_static! {
    static ref EMAIL: Regex = Regex::new(r"^[^@\s]+@[^@\s]+$").expect("email pattern should compile");
}
```

**Good:**

```rust
static EMAIL: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^[^@\s]+@[^@\s]+$").expect("email pattern should compile"));
```
