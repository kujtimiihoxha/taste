---
id: rust/std-mutex-in-async
title: Use std's Mutex for plain data, even in async code
applies: ["**/*.rs"]
severity: should-fix
stage: diff
source: tokio docs, tokio::sync::Mutex, "Which kind of mutex should you use?", https://docs.rs/tokio/latest/tokio/sync/struct.Mutex.html
quote: "Contrary to popular belief, it is ok and often preferred to use the ordinary Mutex from the standard library in asynchronous code."
added: 2026-10-19
---

For short critical sections over plain data with low contention, prefer
`std::sync::Mutex` and drop the guard before any `.await`. Use an async mutex
when the guard must cross `.await` or lock acquisition needs to yield.

**Why:** The async mutex has extra overhead, but yields while waiting for
the lock and allows a guard to cross `.await`. A short, lightly contended
plain-data update often needs neither. If a std guard does end up held across an `.await`, Clippy's
default `await_holding_lock` lint points at it.

**Flag:** `tokio::sync::Mutex` around short, lightly contended updates to
maps, counters, sets or caches whose guard is dropped before any `.await`,
with no need for asynchronous acquisition; functions made `async` only to
take such a lock.

**Don't flag:** a lock chosen for needed asynchronous acquisition or FIFO
fairness; a guard that must be held across `.await`: an I/O resource,
a connection, or a run of async calls that must not interleave;
`tokio::sync::RwLock`, whose fair queue keeps readers from starving writers,
which std's `RwLock` doesn't promise.

**Bad:**

```rust
struct Stats {
    hits: tokio::sync::Mutex<HashMap<String, u64>>,
}

impl Stats {
    async fn record(&self, path: &str) {
        *self.hits.lock().await.entry(path.to_owned()).or_default() += 1;
    }
}
```

**Good:**

```rust
struct Stats {
    hits: std::sync::Mutex<HashMap<String, u64>>,
}

impl Stats {
    fn record(&self, path: &str) {
        *self.hits.lock().unwrap().entry(path.to_owned()).or_default() += 1;
    }
}
```
