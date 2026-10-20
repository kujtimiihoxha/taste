---
id: rust/return-errors-dont-panic
title: Return errors the caller can handle; don't unwrap them
applies: ["**/*.rs"]
severity: must-fix
stage: diff
source: The Rust Programming Language, ch. 9.3 "To panic! or Not to panic!", https://doc.rust-lang.org/book/ch09-03-to-panic-or-not-to-panic.html
quote: "when failure is expected, it's more appropriate to return a Result than to make a panic! call."
added: 2026-10-19
---

If a failure can really happen at run time (bad input, a missing file, a
dropped connection), return it with `?` or handle it. Don't `unwrap()`,
`expect()`, index with `[]` or `panic!` on it. In a function that already
returns `Result` or `Option`, an `unwrap` is usually a missed `?`.

**Why:** A panic bypasses the caller's ordinary `Result` error handling. A server loses the request or
the worker, and a library makes the decision for every one of its users.
Input that never shows up in tests shows up in production.

**Flag:**

- `unwrap()` or `expect()` on parse, I/O, network or deserialize results.
- `[i]` or `.unwrap()` on a lookup keyed by input, where `.get()` can report
  the miss.
- `unwrap()` inside a function that already returns `Result` or `Option`.
- `panic!` for a case the caller can handle, like a value that's too large.

**Don't flag:** tests, examples, build scripts and one-off tools; `main` and
startup code that would exit on bad config anyway; values the code itself
guarantees, like a hard-coded literal (use `expect`, see
`rust/expect-says-why`); a broken contract that is the caller's bug,
documented in a `# Panics` section; `Mutex::lock().unwrap()`, which only fails
after another thread panicked.

**Bad:**

```rust
fn read_count(path: &Path) -> anyhow::Result<u64> {
    let text = fs::read_to_string(path)?;
    Ok(text.trim().parse().unwrap())
}
```

**Good:**

```rust
fn read_count(path: &Path) -> anyhow::Result<u64> {
    let text = fs::read_to_string(path)?;
    Ok(text.trim().parse()?)
}
```
