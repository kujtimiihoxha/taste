import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { Readable } from "node:stream";
import { text } from "node:stream/consumers";
import type { Models } from "@earendil-works/pi-ai";
import type { ModelRef } from "@earendil-works/pi-durable";
import { Command, CommanderError, Option } from "commander";
import { budget, formatBudget } from "./budget.ts";
import { fileDiffs, scopeOf } from "./diff.ts";
import { evidence } from "./evidence.ts";
import { install, type InstallOptions } from "./install.ts";
import { mine } from "./mine.ts";
import {
  BEFORE_PLANNING,
  PLAN_TEMPLATE,
  SEND_PLAN,
  SIMPLIFY,
  WHEN_TO_ASK,
  context,
} from "./prompts.ts";
import {
  TASTE_HOME,
  type Repo,
  branchLabel,
  configOf,
  initRepo,
  openRepo,
  ruleDirs,
} from "./repo.ts";
import { AUTH_FILE, formatReview, review, reviewJson } from "./review.ts";
import { type ReviewStage, brokenReferences, loadRules, problems, route } from "./rules.ts";
import {
  REVIEW_CHECKPOINT,
  type Thread,
  answer,
  numbered,
  readThreads,
  startSimplify,
} from "./state.ts";

// Where one run of the CLI reads and writes. Tests pass their own, and models to review with.
export type Io = {
  stdin: Readable & { isTTY?: boolean };
  stdout: { write(text: string): unknown };
  stderr: { write(text: string): unknown };
  models?: Models;
  model?: ModelRef;
};

// What a command found: text for people, data for --json, and its exit code.
type Output = { text: string; data?: unknown; code?: number };

const count = (n: number, what: string) => `${n} ${what}${n === 1 ? "" : "s"}`;

function status(repo: Repo, threads: Partial<Record<ReviewStage, Thread>>): string {
  const rules = loadRules(ruleDirs(repo));
  const say = (stage: ReviewStage) => {
    const thread = threads[stage];
    if (!thread?.review) return "none";
    if (thread.review.verdict === "approve") return "approved";
    const ids = numbered(thread.review, stage).map((n) => n.id);
    const answered = ids.filter((id) => thread.answers[id]).length;
    return `changes requested in round ${thread.rounds}: ${count(ids.length, "finding")}, ${answered} answered`;
  };
  const pass = threads.diff?.simplify;
  return [
    `${repo.name} on ${branchLabel(repo)}`,
    `packs:    ${configOf(repo).packs.join(", ")}`,
    `rules:    ${route(rules, "plan").length} for plans, ${route(rules, "diff").length} for changes`,
    `config:   ${
      [join(repo.local, "config.json"), join(repo.overlay, "config.json")].find(existsSync) ??
      "automatic defaults (no config file)"
    }`,
    `plan:     ${say("plan")}`,
    `change:   ${say("diff")}`,
    `simplify: ${pass ? `in progress since ${pass.at}` : "none"}`,
  ].join("\n");
}

// After a review that asks for changes: how to answer it, and what to run next.
function nextSteps(stage: ReviewStage, again: string, round: number): string {
  const id = stage === "plan" ? "P" : "F";
  return [
    ...(round >= REVIEW_CHECKPOINT
      ? [
          "Review checkpoint: approval is still required; the round count alone is no reason to stop.",
          "Apply agreed fixes and run the relevant checks, then reply and review again.",
          "Ask the person only for unresolved disagreement or repeated findings without progress; finish independent agreed fixes first.",
          "",
        ]
      : []),
    `${stage === "plan" ? "Change the plan" : "Fix each finding"}, or answer it with the reason it's wrong:`,
    `  taste reply ${id}1 fixed`,
    `  taste reply ${id}1 "disagree: NewStore always sets items, so the check can't fail"`,
    `Then run: ${again}`,
  ].join("\n");
}

function reviewed(
  { review: r, round, parts }: Awaited<ReturnType<typeof review>>,
  stage: ReviewStage,
  again: string,
  data: object,
): Output {
  const code = r.verdict === "approve" ? 0 : round >= REVIEW_CHECKPOINT ? 3 : 2;
  const lines = [formatReview(r, stage, { round, parts })];
  if (code === 0 && stage === "plan")
    lines.push("", "Next: write the code, then run: taste review");
  if (code !== 0) lines.push("", nextSteps(stage, again, round));
  return { text: lines.join("\n"), data: { ...data, round, ...reviewJson(r, stage) }, code };
}

async function reviewPlan(repo: Repo, from: string, dir: string, io: Io): Promise<Output> {
  const plan = (
    from === "-" ? await text(io.stdin) : readFileSync(resolve(dir, from), "utf8")
  ).trim();
  if (!plan) throw new Error("The plan is empty.");
  io.stderr.write(`Reviewing the plan for ${branchLabel(repo)}\n`);
  const result = await review(repo, { stage: "plan", plan }, io.models, io.model);
  return reviewed(result, "plan", `taste review --plan ${from}`, { stage: "plan" });
}

async function reviewChange(
  repo: Repo,
  range: string | undefined,
  base: string | undefined,
  io: Io,
): Promise<Output> {
  const scope = scopeOf(repo, range, base);
  const files = fileDiffs(repo, scope);
  io.stderr.write(`Reviewing ${scope.label}: ${count(files.length, "file")}\n`);
  const data = { stage: "diff", scope: scope.label, files: files.length };
  if (files.length === 0) return { text: "Nothing to review.", data };
  const result = await review(repo, { stage: "diff", scope, files }, io.models, io.model);
  const again = ["taste review", range, base && `--base ${base}`].filter(Boolean).join(" ");
  return reviewed(result, "diff", again, data);
}

async function findings(repo: Repo): Promise<Output> {
  const threads = await readThreads(repo);
  const blocks: string[] = [];
  const data: Record<ReviewStage, object | null> = { plan: null, diff: null };
  let open: { stage: ReviewStage; rounds: number } | undefined;
  for (const stage of ["plan", "diff"] as const) {
    const thread = threads[stage];
    if (!thread?.review) continue;
    const { review: r, rounds, answers } = thread;
    blocks.push(formatReview(r, stage, { round: rounds, answers }));
    data[stage] = { round: rounds, ...reviewJson(r, stage, answers) };
    if (r.verdict !== "approve") open = { stage, rounds };
  }
  if (blocks.length === 0) return { text: `No reviews on ${branchLabel(repo)} yet.`, data };
  if (open) {
    blocks.push(
      nextSteps(
        open.stage,
        open.stage === "plan" ? "taste review --plan <file>" : "taste review",
        open.rounds,
      ),
    );
  }
  return { text: blocks.join("\n\n"), data };
}

async function budgetOf(repo: Repo): Promise<Output> {
  const pass = (await readThreads(repo)).diff?.simplify ?? null;
  const report = budget(repo, pass, scopeOf(repo));
  return {
    text: `${formatBudget(report)}\nNext: taste review`,
    data: report,
    code: report.over.length > 0 ? 2 : 0,
  };
}

function check(): string {
  const rules = loadRules([join(TASTE_HOME, "packs")]);
  const seen = new Map<string, string>();
  const found: string[] = [];
  for (const rule of rules) {
    for (const problem of problems(rule)) found.push(`${rule.file}: ${problem}`);
    const other = seen.get(rule.id);
    if (other) found.push(`${rule.file}: id ${rule.id} is also used by ${other}`);
    seen.set(rule.id, rule.file);
  }
  found.push(...brokenReferences(rules));
  if (found.length > 0) throw new Error(found.join("\n"));
  return `${rules.length} rules, all fine.`;
}

function login(provider: string | undefined): string {
  const dir = dirname(AUTH_FILE);
  mkdirSync(dir, { recursive: true });
  const cli = join(TASTE_HOME, "node_modules", "@earendil-works", "pi-ai", "dist", "cli.js");
  const run = spawnSync(process.execPath, [cli, "login", ...(provider ? [provider] : [])], {
    cwd: dir,
    stdio: "inherit",
  });
  if (run.status !== 0) throw new Error("Login did not finish.");
  chmodSync(AUTH_FILE, 0o600);
  return `Saved to ${AUTH_FILE}. Set the reviewer's model in ~/.taste/config.json, e.g. {"model": "anthropic/claude-opus-5-5"}.`;
}

export async function main(
  argv: string[],
  io: Io = { stdin: process.stdin, stdout: process.stdout, stderr: process.stderr },
): Promise<number> {
  let code = 0;
  // Results go to stdout as text, or as JSON with --json when the command has data.
  const print = (cmd: Command, out: Output) => {
    const json = cmd.optsWithGlobals<{ json?: boolean }>().json && out.data !== undefined;
    io.stdout.write(`${json ? JSON.stringify(out.data, null, 2) : out.text}\n`);
    code = out.code ?? 0;
  };
  const dirOf = (cmd: Command) => resolve(cmd.optsWithGlobals<{ C?: string }>().C ?? ".");
  const repoOf = (cmd: Command) => openRepo(dirOf(cmd));
  const { version } = JSON.parse(readFileSync(join(TASTE_HOME, "package.json"), "utf8"));

  const program = new Command("taste")
    .description(
      "Rules, checks and a reviewer that keep coding agents' changes small, plain and at the right level.",
    )
    .version(version)
    .option("-C <dir>", "run in <dir> instead of the current directory")
    .option("--json", "print JSON: for review, findings and budget")
    .addHelpText(
      "after",
      "\nExit codes: 0 fine, 1 error, 2 changes requested or over budget, 3 review checkpoint: continue agreed fixes; ask only for unresolved disagreement or no progress.",
    )
    .exitOverride()
    .configureOutput({
      writeOut: (s) => io.stdout.write(s),
      writeErr: (s) => io.stderr.write(s),
    });

  program.commandsGroup("Plan and review:");
  program
    .command("plan")
    .description("how to plan: what to look up first, the template, the rules for plans")
    .action((_opts: object, cmd: Command) => {
      const repo = repoOf(cmd);
      const rules = context(repo, { stage: "plan", examples: false, evidence: true });
      print(cmd, {
        text: [BEFORE_PLANNING, PLAN_TEMPLATE, WHEN_TO_ASK, rules, SEND_PLAN].join("\n\n"),
      });
    });
  program
    .command("review")
    .description("review this branch since it left main, uncommitted work included")
    .argument("[range]", "one commit instead, or a..b from a to b, or a...b from where b left a")
    .option("--plan <file>", "review a plan instead, from <file>, or from stdin with -")
    .option("--base <rev>", "where the change starts, instead of where the branch left main")
    .action(
      async (range: string | undefined, opts: { plan?: string; base?: string }, cmd: Command) => {
        const repo = repoOf(cmd);
        if (opts.plan === undefined) print(cmd, await reviewChange(repo, range, opts.base, io));
        else if (range || opts.base)
          throw new Error("A plan review takes no commit, range or --base.");
        else print(cmd, await reviewPlan(repo, opts.plan, dirOf(cmd), io));
      },
    );
  program
    .command("findings")
    .description("the latest findings and answers: P1... on the plan, F1... on the change")
    .action(async (_opts: object, cmd: Command) => print(cmd, await findings(repoOf(cmd))));
  program
    .command("reply")
    .description('answer a finding: fixed, or "disagree: <reason>"')
    .argument("<id>", "the finding, like F2")
    .argument("<answer...>")
    .action(async (id: string, words: string[], _opts: object, cmd: Command) => {
      const said = words.join(" ");
      const stage = await answer(repoOf(cmd), id, said);
      const next = stage === "plan" ? "taste review --plan <file>" : "taste review";
      print(cmd, {
        text: `Saved ${id}: ${said}\nThe reviewer reads it in the next round: ${next}`,
      });
    });
  program
    .command("simplify")
    .description("start a simplify pass, which must not grow the code")
    .action(async (_opts: object, cmd: Command) => {
      await startSimplify(repoOf(cmd));
      print(cmd, { text: `Started a simplify pass.\n\n${SIMPLIFY}` });
    });
  program
    .command("budget")
    .description("how much the code grew, in the simplify pass or on this branch")
    .action(async (_opts: object, cmd: Command) => print(cmd, await budgetOf(repoOf(cmd))));

  program.commandsGroup("Set up:");
  program
    .command("install")
    .description("install the Taste skill for this repo or your user")
    .addOption(new Option("--local", "install in this repository").conflicts("global"))
    .addOption(
      new Option("--global", "install for your user in all repositories").conflicts("local"),
    )
    .option("--codex", "install for Codex")
    .option("--claude", "install for Claude Code")
    .option("--force", "replace an existing skill, including a symlink")
    .action(async (opts: InstallOptions, cmd: Command) =>
      print(cmd, { text: await install(dirOf(cmd), opts, io) }),
    );
  program
    .command("init")
    .description("save this repo's configuration in .taste/config.json")
    .action((_opts: object, cmd: Command) => print(cmd, { text: initRepo(repoOf(cmd)) }));
  program
    .command("status")
    .description("what's set up, and what's in progress")
    .action(async (_opts: object, cmd: Command) => {
      const repo = repoOf(cmd);
      print(cmd, { text: status(repo, await readThreads(repo)) });
    });
  program
    .command("rules")
    .description("the rules for the files this change touches")
    .action((_opts: object, cmd: Command) => {
      const repo = repoOf(cmd);
      const files = fileDiffs(repo, scopeOf(repo)).map((f) => f.path);
      print(cmd, {
        text: context(repo, { stage: "diff", files, examples: true, evidence: false }),
      });
    });
  program
    .command("evidence")
    .description("write hotspots and coupled files, from git history")
    .option("--since <when>", "how far back to look", "12 months ago")
    .option("--top <n>", "how many of each to keep", "15")
    .action((opts: { since: string; top: string }, cmd: Command) => {
      const repo = repoOf(cmd);
      const file = join(repo.overlay, "evidence.md");
      mkdirSync(repo.overlay, { recursive: true });
      writeFileSync(file, evidence(repo, opts.since, Number(opts.top)));
      print(cmd, { text: `Wrote ${file}` });
    });
  program
    .command("mine")
    .description("pull people's review comments from a GitHub repo")
    .argument("<owner/repo>")
    .option("--before <date>", "only comments before this date, like 2025-01-01")
    .option("--after <date>", "only comments after this date")
    .option("--paths <globs>", "only comments on these files, comma-separated", "")
    .option("--limit <n>", "keep at most this many", "2000")
    .action(
      (
        slug: string,
        opts: { before?: string; after?: string; paths: string; limit: string },
        cmd: Command,
      ) => {
        const { file, kept, seen } = mine({
          slug,
          before: opts.before,
          after: opts.after,
          paths: opts.paths.split(",").filter(Boolean),
          limit: Number(opts.limit),
        });
        print(cmd, { text: `Kept ${kept} of ${seen} review comments in ${file}` });
      },
    );
  program
    .command("check")
    .description("check the rule files in taste's own packs")
    .action((_opts: object, cmd: Command) => print(cmd, { text: check() }));
  program
    .command("login")
    .description("log in for the reviewer")
    .argument("[provider]", "anthropic, openai, ...")
    .action((provider: string | undefined, _opts: object, cmd: Command) =>
      print(cmd, { text: login(provider) }),
    );

  try {
    await program.parseAsync(argv, { from: "user" });
    return code;
  } catch (err) {
    // Commander prints its own errors; help and --version end here too, with code 0.
    if (err instanceof CommanderError) return err.exitCode;
    io.stderr.write(`taste: ${(err as Error).message}\n`);
    return 1;
  }
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
