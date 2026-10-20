---
id: shell/set-e-off-in-conditions
title: set -e is off inside a function called as a condition
applies: ["**/*.sh", "**/*.bash"]
severity: must-fix
stage: diff
status: draft
source: Greg's Wiki, BashFAQ/105, "Why doesn't set -e do what I expected?", https://mywiki.wooledge.org/BashFAQ/105
quote: "As soon as a function is used as a conditional (in a list or with a conditional test or loop) set -e stops being applied within the function."
added: 2026-10-19
---

This is the conditional-call form of `core/dont-hide-failures`.
When a function runs as the test of an `if` or `while`, after `!`, or before
`&&` or `||`, `set -e` is off for everything inside it, so a failed step
doesn't stop the next one. Check the steps that matter with `|| return` or
`|| exit`. Those checks work with or without `set -e`.

**Why:** The same function stops at the first error when called on its own
line, and runs to the end when called from an `if`. Wrapping a call in
`if ! step; then` to report errors is exactly what turns `set -e` off.

**Flag:** a function that counts on `set -e` to stop after a failed `cd`,
`cp`, download or build, and has its status tested by `if`, `while`, `!`,
or a following `&&` or `||`. The final command of an AND/OR list is not
exempt merely because it follows one of those operators.

**Don't flag:** `set -euo pipefail` at the top of a script; functions that
check their own important steps; steps whose failure doesn't matter. Experts
disagree on whether to use `set -e` at all, so don't ask to add it or remove
it.

**Bad:**

```bash
set -euo pipefail

backup() {
  cp "$db" "$backup_dir/"
  rm "$db"
}

if ! backup; then
  echo "backup failed" >&2
  exit 1
fi
```

**Good:**

```bash
set -euo pipefail

backup() {
  cp "$db" "$backup_dir/" || return
  rm "$db"
}

if ! backup; then
  echo "backup failed" >&2
  exit 1
fi
```
