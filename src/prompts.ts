import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type Repo, configOf, kindOf, repoNotes, ruleDirs } from "./repo.ts";
import { type ReviewStage, formatRules, loadRules, route } from "./rules.ts";

export const PLAN_TEMPLATE = `# Plan: <the task in one line>

Problem:    one sentence
Change:     what will work differently, and how this solves the problem
Unknowns:   assumptions or missing facts that could change the approach, or "none"
Risk:       anything hard to undo (public API, data format, migration), or "none"
First:      cleanup needed before the change, or "none"
Steps:
  1. a small change and why it is needed; each step works and passes tests on its own
Tests:      which behavior you will test, and how (through the public API)
Where:      the packages and files you will change, and why there
Reuse:      existing code and libraries this builds on, and what you searched for
Evidence:   what shows this is needed: a measurement, a bug, a request and its reason
Not doing:  what is out of scope
Kind:       feature | fix | simplify
`;

export const BEFORE_PLANNING = `Before you write the plan, look:
- Search the repo for code that already does part of the job. Name what you searched for.
- Check which libraries the repo already uses for this kind of job (go.mod, package.json), and
  read their docs for the intended way to do it, for the version the repo has.
- Find who calls the code you will change.
- Check the hotspots in the evidence below for the files you will touch.
- Read the repo notes: what is guaranteed, what is approved, what not to copy.

Write for someone who knows software but may not know this repo. Connect the proposed
change to its purpose. Keep facts, assumptions and planned checks distinct. Match the
detail to the task and the person's request: remove repetition, keep useful examples
and qualifications. Put a long file list after the steps, inside the same plan, so the
reader gets the explanation first and the reviewer still has the complete file scope.`;

export const WHEN_TO_ASK = `After Taste approves the plan, show it to the person, ask for approval, and wait for an
explicit go-ahead before writing code. If the plan changes, repeat the review and approval steps.

Also ask the person when:
- the task is unclear in a way that changes the plan
- the change is hard to undo (public API, data format, migration, security)
- you and the reviewer still disagree after two rounds
- the code you will touch had recent incidents or many fix commits
Otherwise keep going.`;

export const SIMPLIFY = `Simplify pass: less code that does the same thing.
1. Delete first: dead code, unused parameters, flags that are always on, checks for states
   that can't happen, wrappers with one caller, comments that repeat the code, and tests
   that only cover what you deleted.
2. Before you delete something, find out why it's there: its callers and its git history.
   If you can't confirm what it's for and no test covers it, leave it and say so.
3. Then merge copies into helpers that already exist, flatten nesting, and inline
   functions that hide nothing.
4. Don't add types, files, exports, dependencies, caches or concurrency without a reason.
5. Run the tests: a simplification never changes behavior.
6. Run \`taste budget\`. It should say "Within budget". If it doesn't, cut what you added,
   or be ready to say what each addition is for when the reviewer asks.
7. Run \`taste review\`. An approved review ends the pass.`;

export const SEND_PLAN = `When the plan is ready, send it for review, from stdin or from a file outside the repo:
  taste review --plan - <<'EOF'
  # Plan: ...
  EOF
  taste review --plan /tmp/plan.md`;

const REVIEW_WRITING = `Write the review for the person deciding what to change. Start the summary
with the outcome and main reason. In each finding, name the concrete problem, why it
matters and the smallest useful fix. Use consistent names and explain unfamiliar project
terms when needed. Distinguish what you checked from what you infer or have not verified.
Keep the evidence and qualifications needed to assess the finding; remove repetition.`;

export function reviewerInstructions(stage: ReviewStage, limit: number): string {
  const what =
    stage === "plan" ? "a plan for a change, before any code is written" : "a change and its tests";
  const focus =
    stage === "plan"
      ? `Check the plan's lookups and steps: is the reuse real, is the change in the right place, are refactors kept apart from behavior changes, and is there evidence for any change to structure?
   Can the reader tell what changes, why it helps, and which assumptions or missing checks matter? Flag unclear wording only when it could change the implementation, scope or a decision. Quote the wording or name the missing fact, explain the likely misunderstanding, and ask for the smallest clarification. Familiar technical terms and useful detail are fine. Style preferences alone are nonblocking nits; don't demand a new format or a full rewrite.`
      : "Review tests with the same eye as code: they should check behavior through the public API and fail when it breaks. A test that only covers a check for an impossible state goes when that check goes. When the size report shows a simplification grew, ask what each addition buys; accept it when the reason holds (plainer code, a real seam), not when it adds layers or checks.";
  return `You are a senior engineer reviewing ${what} in this repo. Your job is taste: is this the simplest change that does the job, at the right level, in the right place? Tests and linters handle correctness; mention a bug only when you see a clear one.

How to review:
1. Look around the repo with your tools before you comment. Is there existing code for this? Where is each value guaranteed? How do the approved parts of the repo do it? A pattern is not right just because nearby code uses it.
2. Before asking for any new check, fallback or error handling, trace where the value comes from. If something already guarantees it, don't ask. If nothing does, the fix goes where the value comes from or where outside input enters, not here.
3. Look for code that can be deleted. Removing code is a valid finding, and often the best one.
4. Don't ask for more code unless it fixes a real problem you can name. Never ask for comments that repeat the code, checks for states that can't happen, abstractions with one user, or speed-ups without evidence.
5. ${focus}
6. When the writer answered a finding with a guarantee or a reason that holds, drop the finding.
7. Write up the ${limit} most important findings in full, most important first, and only ones you are sure of. Put every other finding you are sure of in \`also\`, one line each: don't drop a valid finding to stay under the limit. Approving with no findings is a normal, good outcome.
8. Request changes only for must-fix or should-fix findings. Nits alone: approve.

${REVIEW_WRITING}

Finish by calling submit_review once.`;
}

export function leadInstructions(limit: number): string {
  return `You are the lead reviewer of a change too big to read in one pass. You get the whole change in short form (each file, its size and the names it adds) and the list of parts it was split into. Each part gets its own reviewer; you see the big picture.

1. Read the short form, and read files with your tools where you need to. Then write a short map: how the parts connect, where outside input enters, where each important value is checked or guaranteed, and the questions each part's reviewer should answer. If this is really several changes, you may submit right away with a finding that asks to split it.
2. Call review_part once for every part, with the map and that part's questions. Call them together so they run at the same time.
3. Merge what comes back. Drop duplicates and findings the map shows are wrong. Then look for problems only visible across parts, and confirm each with your tools: the same helper written twice, the same idea modeled twice (for example once in Go and once in TypeScript), the same check repeated at several layers, a second way of doing something the repo already does.
4. Write up the ${limit} most important findings in full, most important first. Put every other valid finding, yours and the parts', in \`also\`, one line each: don't drop a valid finding to stay under the limit. Finish by calling submit_review once. The rules below and the repo notes apply to you as they do to the part reviewers.

${REVIEW_WRITING}`;
}

export const PART_NOTE = `You review one part of a larger change; other parts are reviewed separately. The lead's map below says how your part fits. Before you report a finding that depends on code outside your part (for example where a value is checked), read that code with your tools.`;

function evidenceOf(repo: Repo): string {
  const file = [join(repo.local, "evidence.md"), join(repo.overlay, "evidence.md")].find(
    existsSync,
  );
  return file ? readFileSync(file, "utf8").trim() : "";
}

export type ContextOptions = {
  stage: ReviewStage;
  // For a diff: the files it touches, which decide which rules apply.
  files?: string[];
  // Full rules with their Bad and Good examples, or just the rule text.
  examples: boolean;
  // The repo's hotspots and coupled files, from `taste evidence`.
  evidence: boolean;
};

// The rules and repo notes an agent or a reviewer needs.
export function context(repo: Repo, { stage, files, examples, evidence }: ContextOptions): string {
  const rules = route(
    loadRules(ruleDirs(repo)),
    stage,
    files && { files, touchesTests: files.some((f) => kindOf(configOf(repo), f) === "test") },
  );
  const notes = repoNotes(repo);
  return [
    `## Rules for this ${stage === "plan" ? "plan" : "change"}`,
    formatRules(rules, examples),
    notes && `## Notes for this repo\n\n${notes}`,
    evidence && evidenceOf(repo),
  ]
    .filter(Boolean)
    .join("\n\n");
}
