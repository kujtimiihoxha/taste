# taste

Rules, checks and a reviewer that keep coding agents' changes small, plain and at the right level.

Coding agents write code that works and is still hard to live with: checks for states that
can't happen, abstractions with one user, "simplifications" that add code, tests that can't
fail. taste gives agents a careful senior engineer's habits: plan before coding, get the plan
and the change reviewed, and never let a simplification grow the code.

## How it works

- **A skill** ([skill/SKILL.md](skill/SKILL.md)) tells the agent when to plan, when to review
  and how to simplify. The same file works for Claude Code and Codex.
- **A CLI**, `taste`, does the work: it picks the rules for the files a change touches,
  measures how much a change grew, and runs the reviewer. It's the only interface: plans go
  in on stdin or as a path, answers to findings go in with `taste reply`, and there are no
  files to write or read by hand.
- **A reviewer** built on [pi-durable](https://github.com/earendil-works/pi/tree/main/packages/durable).
  It runs outside the coding agent with read-only tools, so the agent can't change what grades
  it. It remembers earlier rounds of a review and picks up after a crash. A change too big to
  read in one pass goes to a lead reviewer: it gets the whole change in short form (every
  file, its size and the names it adds), writes a map of how the parts connect, sends each
  part to its own subagent, and merges what comes back, looking for problems that only show
  across parts.
- **Packs** of rules ([packs/](packs/)). Each rule has a Bad and a Good example that show the
  reviewer what to flag and what to leave alone. Rules come from sources picked for who wrote
  them and checked to still hold for current versions: style guides, books, and the review
  history of well-run projects.

The skill guides progress updates and final replies; the CLI prompts guide clear plans
and review findings.

## Install

Needs git and Node 22.18 or newer (taste runs its TypeScript directly).

```sh
git clone <this repo> ~/dev/taste
cd ~/dev/taste && npm install
ln -s ~/dev/taste/bin/taste ~/.local/bin/taste     # the CLI, on your PATH
taste login anthropic                          # or openai, or set ANTHROPIC_API_KEY / OPENAI_API_KEY
```

Install the agent skill from the repo where you want to use Taste:

```sh
taste install -C ~/code/my-repo
```

It asks whether to install for this repository or all your repositories, then whether
to use Codex, Claude Code, or both. Local is suggested inside a Git repo; global is
suggested outside one. For scripts, provide the choices explicitly:

```sh
taste install --local --codex --claude   # this repo, both agents
taste install --global --codex          # your user, all repos, Codex only
```

Local installation writes `.taste/config.json` and copies the skill into
`.agents/skills/taste/` for Codex and `.claude/skills/taste/` for Claude Code.
Commit these files once; other checkouts inherit the setup. Global installation copies
the skills into those same directories under your home and doesn't create repo config.
Each machine still needs Taste on PATH and its own login or API key. Start a new agent
session after installation.

Installing again leaves identical skills and existing config alone. A different skill
or a symlink requires `--force`; it replaces the destination without editing the symlink's
target. After upgrading Taste, refresh the copied skills with the same scope and agents:

```sh
taste install --local --codex --claude --force
```

Review any custom skill edits before using `--force`. If you used the old manual Codex
installation at `~/.codex/skills/taste`, remove that old Taste link after installing in
`~/.agents/skills/taste` to avoid duplicate skills.

## Use it in a repo

Taste works in any Git repo without `init`. It selects core and test rules plus language
and framework packs matching the repo, even when there is only one source file. Files
matching a pack's globs get that pack's rules; generated files don't drive detection.
No placeholder notes or custom rules are created.

To save a shared pack selection without installing skills, run:

```sh
taste init -C ~/code/my-repo       # creates only .taste/config.json; commit it
taste evidence -C ~/code/my-repo   # optional hotspots and coupled files from git history
```

Existing `.taste/config.json` takes precedence over personal repo config and automatic
defaults. `init` preserves existing local config; when personal config exists, it copies
the saved settings into the repo. `taste status` shows the active config and packs.

Add notes under `.taste/` only when you have real guidance. Agents and reviewers read them:

- `invariants.md`: what the code already guarantees, so nobody checks it again.
- `patterns.md`: how this repo does common things.
- `dont-copy.md`: patterns that exist in the repo but must not spread.

Custom rules go in `.taste/rules/` using the [pack format](packs/README.md).
Examples belong in documentation, not in these active guidance files. Exact untouched
note templates from older `init` versions are ignored; edited notes are kept.

## Where things live

| Where                | What                                                                                                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| this repo            | the engine, the shared packs, the skill                                                                                                                                          |
| `~/.taste/`          | your logins (`auth.json`), the reviewer's model (`config.json`), private packs (`packs/`), notes for repos without their own (`repos/<name>/`), mined review comments (`mined/`) |
| `<repo>/.taste/`     | the team's notes and rules for that repo, committed with it. Wins over `~/.taste/repos/<name>/`                                                                                  |
| `<repo>/.git/taste/` | each branch's review threads: the last reviewed plan, findings, answers, rounds and a simplify pass in progress. Never committed                                                 |

## Commands

```text
taste plan                      how to plan: what to look up first, the template, the rules for plans
taste review --plan <file|->    review a plan, from a file or from stdin
taste review                    review this branch since it left main, uncommitted work included
taste review <commit>           review one commit
taste review <a>..<b>           review the change from a to b; <a>...<b> starts where b left a
taste review --base <rev>       review the work since <rev>, uncommitted work included
taste findings                  the latest findings and answers: P1... on the plan, F1... on the change
taste reply <id> <answer>       answer a finding: fixed, or "disagree: <reason>"
taste simplify                  start a simplify pass, which must not grow the code
taste budget                    how much the code grew, in the simplify pass or on this branch
taste install                   install agent skills for this repo or your user
taste init                      save this repo's configuration in .taste/config.json
taste status                    what's set up, and what's in progress
taste rules                     the rules for the files this change touches
taste evidence [--since <when>] hotspots and coupled files, from git history
taste mine <owner/repo>         people's review comments from GitHub [--before <date>]
taste check                     check the rule files in taste's own packs
taste login [provider]          log in for the reviewer
```

Every command takes `-C <dir>` to run somewhere else, and `taste <command> --help` says more.
`review`, `findings` and `budget` print JSON with `--json`. A review says what it covers
first, on stderr, for example `Reviewing branch fix-auth vs origin/main@0283548 plus
uncommitted changes: 12 files`. Each branch has one review thread for its plan and one for
its change, so `taste reply` only takes ids from that thread's latest review.

In CI, review a pull request the way GitHub shows it:

```sh
taste review origin/main...HEAD --json > review.json   # exit code 2: changes requested
```

Exit codes: 0 fine, 1 error, 2 changes requested or over budget, 3 stop and ask the person.

## The reviewer's model

Set it in `~/.taste/config.json`, for example `{"model": "openai/gpt-6-sol"}`, or with
`TASTE_MODEL`. Any provider [pi-ai](https://github.com/earendil-works/pi) supports works. A
model from a different family than your coding agent's gives a real second opinion.

## Adding rules

A rule is one Markdown file in `packs/`; [packs/README.md](packs/README.md) has the format.
`taste check` and `npm test` check that every rule has its sections and both examples. The best rules
come from real review comments by people on well-run projects. `taste mine <owner/repo>`
pulls those from GitHub; `--after` and `--before` pick a window of time.

Rules only your company should see go in `~/.taste/packs/<name>/` and are named in a repo's
`config.json` like any other pack.

## Working on taste

```sh
npm run check   # format, lint and type check (Vite+: Oxfmt, Oxlint, tsgo)
npm run fix     # fix what can be fixed automatically
npm test        # Vitest, through vp test
taste check     # every rule in packs/ has its header, sections and examples
node scripts/check-pack.ts packs/lang/go   # quotes on their pages, examples parse (network)
```

`.npmrc` turns off dependencies' install scripts and pins exact versions.

## Status

Early, and the pi-durable API it builds on is experimental too.
