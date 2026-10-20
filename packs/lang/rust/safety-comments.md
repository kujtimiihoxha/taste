---
id: rust/safety-comments
title: Every unsafe block says why it's sound
applies: ["**/*.rs"]
severity: should-fix
stage: diff
status: draft
source: The Rust Programming Language, ch. 20.1 "Unsafe Rust", https://doc.rust-lang.org/book/ch20-01-unsafe-rust.html
quote: "Likewise, whenever we perform an unsafe operation, it is idiomatic to write a comment starting with SAFETY to explain how the safety rules are upheld."
added: 2026-10-19
---

This is the Rust safety-contract form of `core/comments-say-why`.
Keep each `unsafe` block to the operation that needs it, and put a
`// SAFETY:` comment right above it that says why the rules hold there:
which check, invariant or caller promise makes it sound. In the 2024
edition, the compiler warns by default about unsafe operations outside an
`unsafe` block, even inside an `unsafe fn`. Explain the safety of those blocks
too.

**Why:** The compiler cannot prove the preconditions of unsafe operations,
so the comment gives the reviewer the argument for their safety. Once the reason is
written down, a later change that breaks it stands out. A big block hides
which line needed `unsafe` at all.

**Flag:** `unsafe` blocks with no `// SAFETY:` comment, or one that only says
it's safe; blocks that wrap lines of safe code; a safe `fn` whose soundness
depends on what the caller passes, which should be an `unsafe fn` with a
`# Safety` section.

**Don't flag:** generated bindings; one comment above a group of identical
calls that share the same reason; missing blocks or safety documentation
already reported by rustc or default Clippy lints.

**Bad:**

```rust
let digits = unsafe { std::str::from_utf8_unchecked(&buf[..n]) };
```

**Good:**

```rust
// SAFETY: `write_digits` only writes ASCII digits into `buf[..n]`.
let digits = unsafe { std::str::from_utf8_unchecked(&buf[..n]) };
```
