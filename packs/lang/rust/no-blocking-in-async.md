---
id: rust/no-blocking-in-async
title: Don't block the thread inside async code
applies: ["**/*.rs"]
severity: should-fix
stage: diff
status: draft
source: tokio docs, tokio::task::spawn_blocking, https://docs.rs/tokio/latest/tokio/task/fn.spawn_blocking.html
quote: "In general, issuing a blocking call or performing a lot of compute in a future without yielding is problematic, as it may prevent the executor from driving other futures forward."
added: 2026-10-19
---

Inside an `async fn` or a future, call the async version of anything that
waits: `tokio::fs`, `tokio::time::sleep`, the async client of a database or
HTTP library. For blocking code that has no async version, or for heavy CPU
work, use `tokio::task::spawn_blocking`.

**Why:** The runtime runs many tasks on a few threads. A blocking call keeps
its thread, so every task on that thread waits with it. On a current-thread
runtime, which `#[tokio::test]` uses by default, everything stops.

**Flag:** `std::thread::sleep`, `std::fs`, `std::net`, `reqwest::blocking`,
synchronous database clients and `block_on` inside async code; long CPU work
in a future, like hashing passwords or compressing large files, without
`spawn_blocking`.

**Don't flag:** short `std::sync::Mutex` locks that aren't held across
`.await` (see `rust/std-mutex-in-async`); code already inside
`spawn_blocking` or a plain thread; one-off setup before the program starts
serving, like reading a config file at startup; small CPU work.

**Bad:**

```rust
async fn load_avatar(path: &Path) -> io::Result<Vec<u8>> {
    std::fs::read(path)
}
```

**Good:**

```rust
async fn load_avatar(path: &Path) -> io::Result<Vec<u8>> {
    tokio::fs::read(path).await
}
```
