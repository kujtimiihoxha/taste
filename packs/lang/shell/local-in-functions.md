---
id: shell/local-in-functions
title: Declare function variables local
applies: ["**/*.sh", "**/*.bash"]
severity: should-fix
stage: diff
source: Google Shell Style Guide, "Use Local Variables", https://google.github.io/styleguide/shellguide.html#use-local-variables
quote: "Ensure that local variables are only seen inside a function and its children by using local when declaring them. This avoids polluting the global namespace and inadvertently setting variables that may have significance outside the function."
added: 2026-10-19
---

A variable set inside a shell function is global unless it is declared
`local`, and that includes loop variables. Declare every variable a function
sets with `local`.

**Why:** A helper's `for db in ...` or `count=0` silently changes the caller's
`db` or `count`. The bug shows up far from the function, and only when the
names happen to match.

**Flag:** variables and loop variables set inside a function without `local`,
`declare` or `typeset`, above all in files that other scripts source.

**Don't flag:** globals a function sets on purpose, like an `init` function
that loads config for the rest of the script, with a comment saying so; code
outside functions; scripts for shells without `local`, such as ksh93, which
use naming instead.

**Bad:**

```bash
backup_all() {
  for db in "$@"; do
    pg_dump "$db" > "$backup_dir/$db.sql"
  done
}

db=main
backup_all main audit
psql "$db" -c 'VACUUM'
```

**Good:**

```bash
backup_all() {
  local db
  for db in "$@"; do
    pg_dump "$db" > "$backup_dir/$db.sql"
  done
}

db=main
backup_all main audit
psql "$db" -c 'VACUUM'
```
