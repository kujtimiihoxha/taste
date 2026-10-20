---
id: shell/errors-to-stderr
title: Send error messages to stderr
applies: ["**/*.sh", "**/*.bash"]
severity: should-fix
stage: diff
status: draft
source: Google Shell Style Guide, "STDOUT vs STDERR", https://google.github.io/styleguide/shellguide.html#stdout-vs-stderr
quote: "All error messages should go to STDERR. This makes it easier to separate normal status from actual issues."
added: 2026-10-19
---

Write error messages to stderr with `>&2`. Stdout is for the script's output,
the part a caller captures or pipes on.

**Why:** An error on stdout lands inside `$(...)` or in the next command's
input instead of on the screen, so the failure looks like data or vanishes.

**Flag:** `echo "Error: ..."` or `printf` of an error without `>&2`; a `die`
or `err` function that writes to stdout.

**Don't flag:** help text the user asked for with `--help` (stdout, exit 0);
progress messages in a script whose stdout nobody captures; messages inside a
block that is already redirected with `>&2`.

**Bad:**

```bash
image_tag() {
  if [ -z "${GIT_SHA:-}" ]; then
    echo "GIT_SHA is not set"
    return 1
  fi
  echo "app:${GIT_SHA:0:7}"
}

tag=$(image_tag) || exit 1
```

**Good:**

```bash
image_tag() {
  if [ -z "${GIT_SHA:-}" ]; then
    echo "GIT_SHA is not set" >&2
    return 1
  fi
  echo "app:${GIT_SHA:0:7}"
}

tag=$(image_tag) || exit 1
```
