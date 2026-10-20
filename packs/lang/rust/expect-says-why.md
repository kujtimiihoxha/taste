---
id: rust/expect-says-why
title: When a value can't be missing, say why in expect
applies: ["**/*.rs"]
severity: nit
stage: diff
source: Rust standard library docs, Result::expect, "Recommended Message Style", https://doc.rust-lang.org/std/result/enum.Result.html
quote: "We recommend that expect messages are used to describe the reason you expect the Result should be Ok."
added: 2026-10-19
---

When the code knows a `Result` is `Ok` or an `Option` is `Some` (a
hard-coded literal, a key it just inserted, a node the parser always
creates), use `expect` and write down why it can't fail. Word it as what
should be true: "hard-coded address should parse".

**Why:** If the reason ever stops holding, the panic message names the
assumption that broke. A bare `unwrap()` or `expect("failed")` makes the
reader dig for it, and hides the assumption from whoever changes the code
next.

**Flag:** bare `unwrap()` on values the code assumes are there; `expect`
messages that only say something failed, like "failed", "should work",
"unwrap failed" or "error parsing".

**Don't flag:** tests; failures that can really happen, which should be
returned instead (see `rust/return-errors-dont-panic`); `lock().unwrap()` on a
`Mutex`.

**Bad:**

```rust
let addr: SocketAddr = "127.0.0.1:8080".parse().unwrap();
```

**Good:**

```rust
let addr: SocketAddr = "127.0.0.1:8080".parse().expect("hard-coded address should parse");
```
