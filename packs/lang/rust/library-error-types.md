---
id: rust/library-error-types
title: A library returns its own error type, not String or Box<dyn Error>
applies: ["**/*.rs"]
severity: should-fix
stage: both
status: draft
source: dtolnay, anyhow README, "Comparison to thiserror", https://github.com/dtolnay/anyhow
quote: "Use thiserror if you are a library that wants to design your own dedicated error type(s) so that on failures the caller gets exactly the information that you choose."
added: 2026-10-19
---

A library's public functions return an error type its callers can match on
and pass along: an enum or struct that implements `std::error::Error` and
keeps the underlying error as its `source()`. Derive it with `thiserror`, or
write the `Display` and `Error` impls by hand. An application can use
`anyhow::Result` everywhere.

**Why:** A `String` error can only be printed. The caller can't tell a
missing file from bad input, retry one and not the other, or reach the
original `io::Error`. A `Box<dyn Error>` can't be matched on either, and
`anyhow::Error` in a public API pushes anyhow onto every user.

**Flag:** `pub fn` in a library crate returning `Result<_, String>`,
`Result<_, &str>`, `Box<dyn Error>` or `anyhow::Error`;
`map_err(|e| e.to_string())` that throws away the cause; public error types
that don't implement `std::error::Error`.

**Don't flag:** binaries, CLIs and application code, where `anyhow` is the
right tool; `main`, tests and examples; private helpers whose errors are
mapped before they leave the crate. Don't ask for a variant per failure
either: add variants only for the cases callers handle differently.

**Bad:**

```rust
pub fn parse_config(text: &str) -> Result<Config, String> {
    toml::from_str(text).map_err(|e| e.to_string())
}
```

**Good:**

```rust
#[derive(Debug, thiserror::Error)]
#[error("invalid config")]
pub struct ConfigError(#[from] toml::de::Error);

pub fn parse_config(text: &str) -> Result<Config, ConfigError> {
    Ok(toml::from_str(text)?)
}
```
