---
id: shell/pick-another-language
title: Don't write a program in shell
applies: ["**/*.sh", "**/*.bash"]
severity: should-fix
stage: both
status: draft
source: Google Shell Style Guide, "When to use Shell", https://google.github.io/styleguide/shellguide.html#when-to-use-shell
quote: "If you are writing a script that is more than 100 lines long, or that uses non-straightforward control flow logic, you should rewrite it in a more structured language now."
added: 2026-10-19
---

Shell is for running other programs in order. When a script needs records or
maps, works on data more than it runs programs, or grows past about 100 lines
of logic, write it in the language the repo already uses for its tools. Decide
this in the plan, before the script grows.

**Why:** Shell has no data structures beyond strings and arrays, no
exceptions, and is hard to test. Each of these needs costs many lines and
hides bugs. Scripts only grow, so the rewrite gets harder the longer it waits.

**Flag:** a plan that picks shell for a job that is mostly data work (records,
maps, reports); a new script with more than about 100 lines of logic;
associative arrays used as records; a change that adds such logic to a script
that is already long.

**Don't flag:** scripts that mostly call other tools one after another (build,
deploy and CI glue); repos where shell is the product (an installer, a shell
plugin); a small fix to an existing long script. Raise the rewrite as its own
task.

**Bad:**

```text
Plan: write scripts/sync-users.sh. It pages through the users API with curl,
keeps a map of user ID to team in an associative array, retries failed calls
with backoff, and writes a CSV report.
```

**Good:**

```text
Plan: write tools/sync_users.py, next to the repo's other Python tools. It
pages through the users API, keeps a dict of user ID to team, retries failed
calls, and writes the report with the csv module.
```
