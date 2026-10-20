---
id: core/dont-hide-failures
title: Never hide a failure
applies: ["**/*"]
severity: must-fix
stage: diff
status: draft
source: James Shore, "Fail Fast" (2004), https://www.jamesshore.com/v2/blog/2004/fail-fast; IEEE Software, Design column
quote: "Many people recommend writing software so that it automatically works around errors. This results in software failing in mysterious ways later on."
added: 2026-10-20
---

When something fails, let the caller know. Don't catch an error and carry on as
if it worked, and don't turn a failure into a value that looks like success:
an empty list, `null`, zero, a default. A caller can't tell "there are no
rules" from "loading the rules failed".

**Why:** A hidden failure shows up later as wrong data far from its cause, or
never shows up at all. A failure the caller sees gets fixed.

**Flag:** catch blocks that log and then return `[]`, `null`, `0` or a
default; errors dropped on purpose (`_ =`, `.ok()`, `except: pass`) where the
failure matters; a function whose result can't tell "nothing found" from "it
failed".

**Don't flag:** the layer that handles the error, like a worker loop that logs
and skips one item or a handler that returns a 500 (see
`core/errors-where-you-can-act`); a fallback the product asked for, with a
comment that says so; an expected case handled on purpose, like a missing
optional file; best-effort
work whose failure doesn't matter, like cleanup after the real error; empty
catch blocks and unchecked errors the linter already reports.

**Bad:**

```ts
async function loadRules(): Promise<Rule[]> {
  try {
    const res = await api.get("/rules");
    return parseRules(res.data);
  } catch (err) {
    console.error("failed to load rules", err);
    return [];
  }
}
```

**Good:**

```ts
// The page that calls loadRules shows the error.
async function loadRules(): Promise<Rule[]> {
  const res = await api.get("/rules");
  return parseRules(res.data);
}
```
