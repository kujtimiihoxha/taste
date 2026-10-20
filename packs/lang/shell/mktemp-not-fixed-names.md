---
id: shell/mktemp-not-fixed-names
title: Make temp files with mktemp, not fixed names in /tmp
applies: ["**/*.sh", "**/*.bash"]
severity: must-fix
stage: diff
status: draft
source: Greg's Wiki, BashFAQ/062, "How do I create a temporary file in a secure manner?", https://mywiki.wooledge.org/BashFAQ/062
quote: "The problem with this is: if the file already exists (for example, as a symlink to /etc/passwd), then the script may write things in places they should not be written."
added: 2026-10-19
---

Don't write to a fixed name like `/tmp/build.log` or `/tmp/app.$$`. Make a
private directory with `tmp=$(mktemp -d) || exit`, set `trap 'rm -rf -- "$tmp"' EXIT`
on the next line, and put every temp file inside it. `mktemp` isn't in POSIX,
but GNU and macOS both have it.

**Why:** `/tmp` is shared. With a fixed name, two runs of the script overwrite
each other's files, and another user can plant a symlink there first. Cleanup
on the script's last line never runs when a step fails.

**Flag:** creating or writing files at predictable paths under `/tmp` or
`/var/tmp`, including literal names or names built from `$$` or `$RANDOM`.

**Don't flag:** files inside a directory the script made with `mktemp -d`;
private directories (`$XDG_RUNTIME_DIR`, the repo's build output); temp
directories a test framework provides (`$BATS_TEST_TMPDIR`).

**Bad:**

```bash
curl -fsSL "$url" -o /tmp/node.tar.gz
tar -xzf /tmp/node.tar.gz -C "$prefix"
rm /tmp/node.tar.gz
```

**Good:**

```bash
tmp=$(mktemp -d) || exit
trap 'rm -rf -- "$tmp"' EXIT
curl -fsSL "$url" -o "$tmp/node.tar.gz"
tar -xzf "$tmp/node.tar.gz" -C "$prefix"
```
