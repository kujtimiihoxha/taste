---
id: shell/parse-json-with-jq
title: Read JSON with jq, not grep or sed
applies: ["**/*.sh", "**/*.bash"]
severity: should-fix
stage: diff
source: Greg's Wiki, "BashWeaknesses", https://mywiki.wooledge.org/BashWeaknesses
quote: "JSON parsing. Not quite as bad as XML, but you still shouldn't use the wrong tool for the job. Try jq instead"
added: 2026-10-19
---

Get values out of JSON with `jq`, or with the tool's own query flag (`gh
--jq`, `kubectl -o jsonpath`). Don't cut JSON apart with `grep`, `sed`, `awk`
or `cut`. The same goes for XML and HTML: use a parser.

**Why:** Text tools see lines and characters, not keys and nesting. They break
when the formatting changes or a value holds a quote, and they pick up the
same key from somewhere else in the file.

**Flag:** `grep`, `sed`, `awk` or `cut` used to pull a value out of JSON, XML
or HTML: API responses, `package.json`, cloud CLI output.

**Don't flag:** searching JSON logs for a string (`grep "$request_id"
app.jsonl`) without pulling a value out; line-based formats such as
`key=value` files and `/etc/os-release`. If the repo doesn't use jq yet,
adding it is a new dependency (`core/new-dependency-needs-a-reason`); the
tool's own query flag, or another language, may fit better.

**Bad:**

```bash
version=$(grep '"version"' package.json | sed 's/.*: *"\(.*\)".*/\1/')
```

**Good:**

```bash
version=$(jq -r .version package.json)
```
