---
id: shell/if-not-and-or
title: Use if, not &&, as the last command of a function
applies: ["**/*.sh", "**/*.bash"]
severity: should-fix
stage: diff
source: Greg's Wiki, BashFAQ/105 Answers, exercise 3, https://mywiki.wooledge.org/BashFAQ/105/Answers
quote: "However, the function fn returns 1 (failure) because that was the exit status of the last command executed in the function."
added: 2026-10-19
---

When `[ -n "$x" ] && cmd` is optional work at the end of a function or script
and a false test should still mean success, write
it as `if [ -n "$x" ]; then cmd; fi`. The `&&` form fails when the test is
false, that failure becomes the function's or script's exit status, and under
`set -e` the caller stops. An `if` whose test is false returns 0.

**Why:** A debug helper written as `[ -n "$DEBUG" ] && echo ...` returns 1
whenever debugging is off, so with `set -e` its first call quietly ends the
script.

**Flag:** `[ ... ] && cmd`, `[[ ... ]] && cmd` or `test ... && cmd` as the
last command of a function or script whose false condition should still
return success.

**Don't flag:** predicates or scripts that intentionally return the test
status to their callers; the same line in the middle of a function or script, where a
false test changes nothing; `[ ... ] || cmd`, which returns 0 when the test is
true; error exits such as `cd "$dir" || exit` and `cmd || return`.

**Bad:**

```bash
set -e

log_debug() {
  [ -n "${DEBUG:-}" ] && echo "debug: $*" >&2
}

log_debug "starting"
echo "started"
```

**Good:**

```bash
set -e

log_debug() {
  if [ -n "${DEBUG:-}" ]; then
    echo "debug: $*" >&2
  fi
}

log_debug "starting"
echo "started"
```
