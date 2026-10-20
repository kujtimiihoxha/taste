# Writing a pack that isn't slop

A pack is 8 to 12 review rules for one language, framework or tool. This page
says how to write one. It's for people and for the coding agents they use: an
agent asked to write a pack should read this first and follow it.

## The test

A rule belongs in a pack only if a senior engineer who knows the language would
leave the same comment in a review, and no standard tool already makes that call.

## Where rules come from

Never from memory. A model's memory is the average of the code it has read,
and averaging is how slop gets made. Rules come from two places:

1. **Canonical sources.** Pages written or maintained by the language's own
   authors (docs, PEPs, JEPs, RFCs), and guides by named experts or by teams
   that run large codebases. For example: the PEPs and Python docs, the JDK
   docs and JEPs, the Rust Book and the Rust API Guidelines, the Google style
   guides, the ShellCheck wiki and Greg's Wiki (BashFAQ, BashPitfalls), the
   PostgreSQL docs and wiki, Use The Index, Luke. Not: listicles, Medium posts,
   "best practices" pages, content farms, or pages with no named author or
   owner.
2. **Real reviews.** Review comments people left on large, well-run open
   source projects. They show which comments senior reviewers actually make,
   and how often.

The year doesn't decide anything. Old advice can be out of date, and new
advice from the same experts is just as good. What decides is who wrote it and
whether it holds for the current stable version: check the current docs for
the feature, link the current version of a docs page, and when a rule depends
on a version (Postgres 11+, Java 16+, Vue 3.5+), say so in the rule.

Every rule cites one canonical page by URL in `source`, and copies one passage
from that page into `quote`, word for word. Copy it from the page
(`node scripts/page.ts <url> <pattern>` prints the page's sentences that match), never from memory. The check
fetches the page and fails the rule if the passage isn't there. If no passage
on a good source supports the rule, drop the rule. Don't stretch a quote that
says something nearby. A book can be named in `source` after the URL, but the
quote must come from the page, because a book can't be checked.

Review comments don't go in the rule: no PR or comment links in rule files.
Use them to decide which rules are real and how often the mistake comes up,
and keep the links and counts in your notes.

## Gates

Keep a rule only if all of these hold. When in doubt, cut it.

1. **Specific to the language.** General advice (names, small functions, dead
   code, checks at the edge, where errors are handled, abstractions, tests) is
   the job of `packs/core` and `packs/tests`, and they already have it. Read
   them first. If the language changes how a core rule plays out, write only
   that twist and name the core rule. Don't use `overrides` for this: in a
   change that mixes languages, the core rule would be left out for all of it.
2. **Not a default lint.** If the compiler, the standard formatter, or the
   linter most projects run (with its default settings) already catches it,
   leave it to the tool. Rules are for judgment calls.
3. **A real mistake.** Flag names something people and coding agents actually
   get wrong, concretely enough to point at a line. Prefer mistakes you saw in
   real reviews.
4. **No code for its own sake.** A rule that asks for more checks, layers,
   options or abstractions needs a strong reason. Where it conflicts with a
   core rule, core wins.
5. **A real "Don't flag".** The cases where the rule doesn't apply, especially
   the ones a strict reviewer would get wrong.
6. **Honest severity.** must-fix only for bugs, data loss, security holes or
   outages. Most rules are should-fix. Matters of taste are nit.
7. **Current.** It holds for the current stable version of the language or
   tool. A rule built on behavior that has since changed gets fixed or cut.

## Examples

Bad and Good show the same small, realistic case, different in one way. Good
is the plain fix: no extra validation, logging, comments or layers the rule
didn't ask for, and usually no longer than Bad. Both must parse; the check runs
the language's own tools on them. For shell, ShellCheck must pass on Good, and
if ShellCheck already flags Bad for the rule's own point, the rule is a lint.

## Format

Same as the existing packs ([packs/README.md](packs/README.md)), plus three header fields:

```markdown
---
id: python/narrow-try
title: Keep the try block to the line that can fail
applies: ["**/*.py"]
severity: should-fix
stage: diff
status: draft
source: PEP 8, "Programming Recommendations", https://peps.python.org/pep-0008/#programming-recommendations
quote: "Additionally, for all try/except clauses, limit the try clause to the absolute minimum amount of code necessary."
added: 2026-10-19
---
```

- `status: draft` stays until a person fluent in the language has read the
  pack. They remove it.
- `quote` is in double quotes; write a `"` inside it as `\"`.

Write like the existing packs: plain words, short sentences, one idea per rule.

## Steps

1. Read `packs/README.md`, every rule in `packs/core` and `packs/tests`, and
   `packs/lang/go` for the voice.
2. Mine reviews. Pick two big repos in the language with heavy human review.
   Sample a few windows, old and recent:
   `taste mine <owner/repo> --after 2020-06-01 --before 2021-01-01 --paths '**/*.py' --limit 500`
   (also, say, 2023 and 2025). It writes to `~/.taste/mined/`, so copy each
   window's file before the next run. Bots and AI reviewer accounts are
   dropped. Read at least 150 comments; prefer those
   by maintainers (`role` OWNER, MEMBER or COLLABORATOR) that ask for a change.
   Most comments are about the project itself (its docs, its names, its
   features): skip those. Tally the ones about the language.
3. Read the canonical sources. Find what they warn about.
4. Write 12 to 20 candidates in a notes file outside the pack folder: the rule in one line, the
   source passage, the review comments that back it, and how often the mined
   reviews raised it.
5. Cut to 8 to 12 with the gates. Record every cut and its reason in the notes.
6. Write the rules in `packs/lang/<pack>/` (or `packs/framework/<name>/`). Run
   `node scripts/check-pack.ts packs/lang/<pack>` until it passes. It fetches
   each source page, and runs the examples through python3, bash and
   ShellCheck, gofmt, Vue's compiler and Babel, and Postgres, javac and rustc
   in Docker. A language whose tool you don't have is noted, not failed.
7. Open a pull request with the rules, and paste the notes into its
   description. The review links stay there; rule files never carry them.

## Verification

A second agent that didn't write the pack audits it before a person sees it:

1. Run `node scripts/check-pack.ts packs/lang/<pack>`. Every FAIL gets fixed or the
   rule is cut.
2. For each rule, open the source page around the quote (`scripts/page.ts`).
   Does the passage, in context, say what the rule says, about the same
   situation? A stretched quote cuts the rule. Then check it's still true:
   open the current docs for the feature.
3. Go through the gates one by one. Look hardest at: repeats core or tests, is
   a default lint, asks for more code, weak Don't flag, inflated severity, out
   of date.
4. Read the examples. Does Bad show the mistake and Good the plain fix? Is
   Good padded?
5. Open the review links in the notes. Do the comments ask for the same thing?
6. Cut or tighten; never add a rule. Record each decision and its reason
   under "Verification" in the notes.
