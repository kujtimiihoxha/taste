---
id: rust/slice-at-char-boundaries
title: Slice strings only at char boundaries
applies: ["**/*.rs"]
severity: must-fix
stage: diff
source: The Rust Programming Language, ch. 8.2 "Storing UTF-8 Encoded Text with Strings", https://doc.rust-lang.org/book/ch08-02-strings.html
quote: "If we were to try to slice only part of a character's bytes with something like &hello[0..1], Rust would panic at runtime in the same way as if an invalid index were accessed in a vector"
added: 2026-10-19
---

`str` indexes are byte offsets, and characters outside ASCII take two to four
bytes. `&s[..n]` panics when `n` falls inside a character. Slice only at
offsets that came from the same string (`find`, `char_indices`, a prefix you
just matched). To cut text to a length, use `s.floor_char_boundary(n)` (Rust
1.91+) or `char_indices` on older compilers.

**Why:** ASCII test data passes, then the first name with an accent or an
emoji crashes the program.

**Flag:** `&s[..n]`, `&s[i..j]` or `s.split_at(n)` on text that can hold
non-ASCII, where the offset is a constant, the length of something else, or
byte arithmetic like `i + 1` or `s.len() - 1`; truncating names or messages
for display with a byte range.

**Don't flag:** offsets returned by searches on the same string; text the
code has checked is ASCII; `&[u8]` byte slices; `strip_prefix`, `split_once`
and similar methods, which can't split a character.

**Bad:**

```rust
fn preview(text: &str) -> &str {
    if text.len() > 40 { &text[..40] } else { text }
}
```

**Good:**

```rust
fn preview(text: &str) -> &str {
    &text[..text.floor_char_boundary(40)]
}
```
