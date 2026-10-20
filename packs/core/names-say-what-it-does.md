---
id: core/names-say-what-it-does
title: A name says what the thing is or does
applies: ["**/*"]
severity: should-fix
stage: diff
status: draft
source: Google Engineering Practices, "What to look for in a code review", Naming, https://google.github.io/eng-practices/review/reviewer/looking-for.html
quote: "A good name is long enough to fully communicate what the item is or does, without being so long that it becomes hard to read."
added: 2026-10-20
---

A name says what the thing is or does. If the code does more than its name
says, or something else, the name misleads every reader who trusts it. When a
change makes code do something new, check that its name still fits.

**Why:** Readers and callers act on the name without reading the body. A
`validateRule` that also saves gets called by someone who only wanted to
validate.

**Flag:** names that say something the code doesn't do, or hide a side effect
(`validate` that writes, `get` that creates, `sleepBackoff` that only computes
a delay); names the change left behind after changing what the code does.

**Don't flag:** short names in a small scope (`i`, `err`, `ctx`); names fixed
by an API, a framework or a wire format; casing the linter checks; names the
change doesn't touch (renaming them is its own step, see
`core/smallest-change`); a name you would only have picked differently.

**Bad:**

```python
def validate_rule(rule, store):
    if not rule.name:
        raise ValueError("rule needs a name")
    store.save(rule)
```

**Good:**

```python
def save_rule(rule, store):
    if not rule.name:
        raise ValueError("rule needs a name")
    store.save(rule)
```
