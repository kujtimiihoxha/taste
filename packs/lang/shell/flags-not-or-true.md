---
id: shell/flags-not-or-true
title: Use rm -f and mkdir -p, not || true
applies: ["**/*.sh", "**/*.bash"]
severity: should-fix
stage: diff
status: draft
source: POSIX.1-2024, "rm", option -f, https://pubs.opengroup.org/onlinepubs/9799919799/utilities/rm.html
quote: "Do not write diagnostic messages or modify the exit status in the case of no file operands, or in the case of operands that do not exist."
added: 2026-10-19
---

When a failure is expected and harmless, use the flag that makes it not a
failure: `rm -f` for a file that may be gone, `mkdir -p` for a directory that
may exist. Don't add `|| true` or `2>/dev/null`, which hide every other failure
too, like a full disk or a wrong permission. It's a milder case of
`core/dont-hide-failures`: the failure these lines expect is harmless, so this
is should-fix, but `|| true` hides the rare real failure along with it.

**Why:** `rm -f` still fails when a file can't be removed for a real reason.
`rm ... 2>/dev/null || true` never fails, so the script goes on in a bad state
and nothing says why.

**Flag:** `|| true`, `|| :` or `2>/dev/null` on `rm` or `mkdir` where `-f` or
`-p` covers the expected case.

**Don't flag:** deliberate best-effort cleanup whose failure does not matter
(`core/dont-hide-failures`); commands whose nonzero results are all acceptable.
If only `grep` finding no match is harmless, distinguish that status from an
actual read or execution error.

**Bad:**

```bash
rm "$cache_dir/index.db" 2>/dev/null || true
mkdir "$out_dir" 2>/dev/null || true
cp build/app "$out_dir/"
```

**Good:**

```bash
rm -f "$cache_dir/index.db"
mkdir -p "$out_dir"
cp build/app "$out_dir/"
```
