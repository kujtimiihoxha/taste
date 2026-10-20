---
id: shell/pipe-hides-failures
title: A pipeline hides every failure but the last
applies: ["**/*.sh", "**/*.bash"]
severity: must-fix
stage: diff
status: draft
source: GNU Bash Reference Manual (Bash 5.3), "Pipelines", https://tiswww.case.edu/php/chet/bash/bashref.html#Pipelines
quote: "The exit status of a pipeline is the exit status of the last command in the pipeline, unless the pipefail option is enabled (see The Set Builtin)."
added: 2026-10-19
---

This is the pipeline form of `core/dont-hide-failures`.
`cmd | tee log` succeeds when `cmd` fails, because a pipeline reports only its
last command. When an earlier command's failure matters, turn on
`set -o pipefail`, or check `PIPESTATUS` right after the pipeline. Bash has
`pipefail`, and POSIX added it in 2024, but check your `/bin/sh` before
relying on it there: the `dash` in Ubuntu 24.04 and Debian 12 rejects it.

**Why:** This is how CI goes green on failing tests: `npm test | tee
test.log` and `go test | go-junit-report` both exit 0 when tests fail.
`set -e` doesn't help, because the pipeline as a whole succeeded.

**Flag:** a pipeline whose first command does the real work (tests, a build,
a download, a dump) and whose last command almost always succeeds (`tee`,
`gzip`, `sed`, a report formatter), in a script without `pipefail`.

**Don't flag:** scripts that already set `pipefail`; pipelines where only the
last command matters; `cmd | head -n1` and `cmd | grep -q`, where `pipefail`
can turn the early exit of `head` or `grep` into a false failure. In a script
with many of those, ask for a `PIPESTATUS` check on the one pipeline that
matters instead of a global `pipefail`.

**Bad:**

```bash
set -eu

npm test 2>&1 | tee test.log
echo "tests passed"
```

**Good:**

```bash
set -euo pipefail

npm test 2>&1 | tee test.log
echo "tests passed"
```
