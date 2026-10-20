---
id: shell/arrays-for-arguments
title: Build argument lists in arrays, not strings
applies: ["**/*.sh", "**/*.bash"]
severity: should-fix
stage: diff
source: Google Shell Style Guide, "Arrays", https://google.github.io/styleguide/shellguide.html#arrays
quote: "Using a single string for multiple command arguments should be avoided, as it inevitably leads to authors using eval or trying to nest quotes inside the string, which does not give reliable or readable results and leads to needless complexity."
added: 2026-10-19
---

When a command's arguments depend on conditions, collect them in a bash array
with `args+=(--flag "$value")` and run `cmd "${args[@]}"`. Don't build a
string and run it with `eval`, or turn off ShellCheck's SC2086 so the string
splits.

**Why:** A string loses the borders between arguments. A value with a space
splits in two, quotes inside the string stay literal, and with `eval` a value
like `$(rm -rf ~)` runs as code.

**Flag:** a command or a list of options built as a string and run with
`eval`; `# shellcheck disable=SC2086` on such a string, so that it splits.

**Don't flag:** `set -- "$@" --flag "$value"` in POSIX `sh` scripts, which have
no arrays; `eval "$(tool ...)"` for tools whose output is made for `eval`, such
as `ssh-agent` and `brew shellenv`.

**Bad:**

```bash
opts="--rm -v $PWD:/src"
if [ -n "$tag" ]; then
  opts="$opts -e TAG=$tag"
fi
eval "docker run $opts $image make"
```

**Good:**

```bash
opts=(--rm -v "$PWD:/src")
if [ -n "$tag" ]; then
  opts+=(-e "TAG=$tag")
fi
docker run "${opts[@]}" "$image" make
```
