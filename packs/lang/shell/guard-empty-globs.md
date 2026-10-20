---
id: shell/guard-empty-globs
title: Handle a glob that matches nothing
applies: ["**/*.sh", "**/*.bash"]
severity: should-fix
stage: diff
status: draft
source: Greg's Wiki, BashPitfalls, pitfall 1, https://mywiki.wooledge.org/BashPitfalls
quote: 'What happens if there are no *.mp3-files in the current directory? Then the for loop is executed once, with file="./*.mp3", which is not the expected behavior!'
added: 2026-10-19
---

When no file matches, `for f in "$dir"/*.csv` runs once, with `f` set to the
pattern itself. If an empty directory is a normal state, skip that case with
`[ -e "$f" ] || continue` as the loop's first line. In bash,
`shopt -s nullglob` also works, but it changes every glob in the script.

**Why:** The loop then runs its commands on a file named `*.csv`. They fail
with a confusing error, or, under `set -e`, stop a script that simply had
nothing to do.

**Flag:** a `for` loop over a glob in a directory that can be empty: an inbox,
an upload or cache directory, optional plugins or migrations.

**Don't flag:** globs over files the script just created or that always exist;
loops where no match should be an error and the command's own error says so;
`rm -f` on a glob, which ignores the unmatched pattern.

**Bad:**

```bash
for f in "$incoming"/*.csv; do
  import_csv "$f"
  mv "$f" "$done_dir/"
done
```

**Good:**

```bash
for f in "$incoming"/*.csv; do
  [ -e "$f" ] || continue
  import_csv "$f"
  mv "$f" "$done_dir/"
done
```
