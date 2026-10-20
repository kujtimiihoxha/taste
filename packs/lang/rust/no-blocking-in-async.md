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

Inside an `async fn` or a future, use the async operations and blocking-work
facility of the runtime the project uses. With Tokio, that means `tokio::fs`,
`tokio::time::sleep`, an async database or HTTP client, and
`tokio::task::spawn_blocking` for blocking code without an async version or
heavy CPU work.

**Why:** The runtime runs many tasks on a few threads. A blocking call keeps
its thread, so every task on that thread waits with it. On a current-thread
runtime, which `#[tokio::test]` uses by default, everything stops.

**Flag:** `std::thread::sleep`, `std::fs`, `std::net`, `reqwest::blocking`,
synchronous database clients and `block_on` inside async code; long CPU work
in a future, like hashing passwords or compressing large files, without
the runtime's blocking-work facility or a dedicated worker thread.

**Don't flag:** short `std::sync::Mutex` locks with low contention that aren't held across
`.await` (see `rust/std-mutex-in-async`); code already inside
the runtime's blocking-work facility or a plain thread; one-off setup before the program starts
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
