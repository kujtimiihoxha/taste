---
id: rust/library-error-types
title: Expose typed errors when library callers need them
applies: ["**/*.rs"]
severity: should-fix
stage: both
source: dtolnay, anyhow README, "Comparison to thiserror", https://github.com/dtolnay/anyhow
quote: "Use thiserror if you are a library that wants to design your own dedicated error type(s) so that on failures the caller gets exactly the information that you choose."
added: 2026-10-19
---

When library callers handle failures differently, expose the typed
information they need instead of reducing every error to text. An existing
standard or dependency error may already supply that contract. If the
library needs its own error categories, expose a dedicated enum or struct
implementing `std::error::Error`, retaining underlying errors callers need
through `source()`. This is the Rust error-contract form of
`core/errors-where-you-can-act`.

**Why:** Converting an error to `String` discards its type and cause chain.
Callers then have to parse display text to recover distinctions they need.
`Box<dyn Error>` and `anyhow::Error` support downcasting; judge whether the
API exposes the required information, not just the return type's spelling.

**Flag:** a public library error path that discards a type, category or
underlying cause that callers need to inspect or handle differently, such
as `map_err(|e| e.to_string())` that replaces a needed typed cause with its
display text.

**Don't flag:** binaries, CLIs and application code; `main`, tests and
examples; private helpers whose errors are mapped before leaving the crate;
standard, dependency or dynamic errors that already meet the caller
contract; errors that callers only need to display. Don't add a custom type
or dependency merely to wrap an adequate existing error
(`core/no-single-use-abstraction`, `core/new-dependency-needs-a-reason`). Add
variants only for cases callers handle differently.

**Bad:**

```rust
// The ConfigError API must expose its TOML cause; this crate already uses thiserror.
pub fn parse_config(text: &str) -> Result<Config, String> {
    toml::from_str(text).map_err(|e| e.to_string())
}
```

**Good:**

```rust
// The ConfigError API must expose its TOML cause; this crate already uses thiserror.
#[derive(Debug, thiserror::Error)]
#[error("invalid config")]
pub struct ConfigError(#[from] toml::de::Error);

pub fn parse_config(text: &str) -> Result<Config, ConfigError> {
    Ok(toml::from_str(text)?)
}
```
