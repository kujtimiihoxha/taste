---
id: rust/std-mutex-in-async
title: Use std's Mutex for plain data, even in async code
applies: ["**/*.rs"]
severity: should-fix
stage: diff
status: draft
source: tokio docs, tokio::sync::Mutex, "Which kind of mutex should you use?", https://docs.rs/tokio/latest/tokio/sync/struct.Mutex.html
quote: "Contrary to popular belief, it is ok and often preferred to use the ordinary Mutex from the standard library in asynchronous code."
added: 2026-10-19
---

To guard plain data in async code (a map, a counter, a cache), use
`std::sync::Mutex` and drop the guard before any `.await`. Use
`tokio::sync::Mutex` only when the guard has to stay alive across an
`.await`, such as a shared connection.

**Why:** The async mutex is slower and turns every access into an `.await`.
Its one extra power is staying locked across an `.await`, which plain data
doesn't need. If a std guard does end up held across an `.await`, Clippy's
default `await_holding_lock` lint points at it.

**Flag:** `tokio::sync::Mutex` around maps, counters, sets or caches whose
guard is dropped before any `.await`; functions made `async` only so they
can take such a lock.

**Don't flag:** a guard that must be held across `.await`: an I/O resource,
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
