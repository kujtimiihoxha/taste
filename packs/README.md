# Packs

A pack is a folder of rules. Each rule is one Markdown file with a small header.
The engine picks the rules that apply to the files a change touches, and gives
them to the planner, the writer and the reviewer.

```
packs/
├── core/                 any language
├── tests/                test code, any language
├── lang/<language>/      go, java, python, rust, shell, sql, typescript
└── framework/<name>/     react, vue
```

Private packs, like one company's conventions, go in `~/.taste/packs/<name>/`
and are found first. A repo adds its own rules in `<repo>/.taste/rules/`, or in
`~/.taste/repos/<name>/rules/` until the team commits them. A rule can replace
another one by listing its id in `overrides`: when the replacing rule applies to
a change, the other one is left out.

To add or change rules, follow [CONTRIBUTING.md](../CONTRIBUTING.md): where rules
may come from, the gates every rule passes, and the checks to run.

## Where taste comes from

Rules come from people who know the language: its own docs and design notes
(PEPs, JEPs, RFCs), style guides from teams that run large codebases, books and
talks by named experts, and the review history of well-run projects. What
counts is who wrote it and whether it still holds for current versions, not the
year: old advice can be out of date, and new advice from the same people is just
as good.

Two things are not sources. A model's memory is the average of the code it has
seen. And "the repo already does it this way" is not a reason on its own: much
recent code was written by agents and never reviewed for taste. Repos list the
patterns agents must not copy in `dont-copy.md`.

## Rule format

For example:

````markdown
---
id: python/narrow-try
title: Keep the try block to the line that can fail
applies: ["**/*.py"]
severity: should-fix
stage: diff
status: draft
source: PEP 8, "Programming Recommendations", https://peps.python.org/pep-0008/#programming-recommendations
quote: "Additionally, for all try/except clauses, limit the try clause to the absolute minimum amount of code necessary."
added: 2026-10-20
---

One short paragraph: the rule, in plain words.

**Why:** one or two sentences.

**Flag:** what the reviewer should point at.

**Don't flag:** when the rule does not apply. Every rule needs this.

**Bad:**

```python
# a small, realistic example
```

**Good:**

```python
# the same example, done right
```
````

The engine reads these header fields:

| Field       | Meaning                                                                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`        | `<pack>/<slug>`, unique, never reused                                                                                                                                           |
| `title`     | short, plain words                                                                                                                                                              |
| `applies`   | JSON list of path globs (`**/*.go`, `**/*.tsx`), or `tests` for the files the repo counts as tests                                                                              |
| `severity`  | `must-fix`, `should-fix` or `nit`                                                                                                                                               |
| `stage`     | `plan`, `diff` or `both`: when the rule is checked                                                                                                                              |
| `overrides` | optional JSON list of rule ids this rule replaces where it applies                                                                                                              |
| `status`    | optional: `retired` drops the rule without deleting its file. `draft` changes nothing in the engine: no one fluent in the language has approved the rule yet, and it still runs |

These are for people, so anyone can confirm a rule says what its source says:

| Field    | Meaning                                                             |
| -------- | ------------------------------------------------------------------- |
| `source` | where the rule comes from, with the URL of the page `quote` is from |
| `quote`  | a passage from that page, copied word for word, that backs the rule |
| `added`  | date the rule was added                                             |

New rules need a `source` URL and a `quote`.

Writing rules:

- Plain words. Short sentences. One idea per rule.
- The **Bad** and **Good** examples show the reviewer what to flag and what to
  leave alone. Keep them small, realistic, and different in one way.
- The Good example should usually be the same size or smaller than the Bad one.
- **Don't flag** is not optional. A rule without limits turns into noise.
