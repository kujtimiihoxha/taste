---
id: rust/silence-lints-narrowly
title: Fix the lint; if you must silence it, do it on one item with a reason
applies: ["**/*.rs"]
severity: should-fix
stage: diff
source: Rust RFC 2383, "lint reasons", https://rust-lang.github.io/rfcs/2383-lint-reasons.html
quote: "Lint settings should have an explanation for their use to explain why they were chosen and where they are or are not applicable."
added: 2026-10-19
---

When rustc or Clippy warns, change the code. If the lint is wrong in that one
spot, put the attribute on that item, not on the module or crate, and give
the reason: `#[expect(lint, reason = "...")]` (Rust 1.81+). `expect` warns
once the lint stops firing, so stale exceptions get cleaned up.

**Why:** A crate-wide `#![allow(...)]` hides every later warning of that
kind, including the real bugs. Without a reason, nobody can tell whether the
exception still applies.

**Flag:** new `#![allow(...)]` at the top of a crate or module, above all for
`dead_code`, `unused` or whole Clippy groups; `#[allow]` or `#[expect]` with
no reason or comment; an `allow` added in the same change that caused the
warning, when the code could be fixed instead; `#[allow(dead_code)]` on code
nothing uses, which should be deleted (`core/delete-first`).

**Don't flag:** deliberate project-wide lint policy, whether set in the
`[lints]` table of `Cargo.toml` or crate attributes; generated code; `allow` instead of `expect` when the lint only
fires on some targets or features, since `expect` would then warn on the
rest; a comment instead of `reason` on toolchains older than 1.81.

**Bad:**

```rust
#![allow(dead_code)]

#[derive(Debug)]
pub struct Request {
    pub path: String,
    trace_id: u128,
}
```

**Good:**

```rust
#[derive(Debug)]
pub struct Request {
    pub path: String,
    #[expect(dead_code, reason = "only read through Debug, for request logs")]
    trace_id: u128,
}
```
