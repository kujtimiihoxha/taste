import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { type Credential, type CredentialStore, type Models, Type } from "@earendil-works/pi-ai";
import { createModels } from "@earendil-works/pi-ai/models";
import { builtinProviders } from "@earendil-works/pi-ai/providers/all";
import {
  type ConversationId,
  type Extension,
  type Harness,
  type ModelRef,
  configure,
  createRegistry,
  defineExtension,
  defineTool,
} from "@earendil-works/pi-durable";
import { budget, formatBudget } from "./budget.ts";
import { type FileDiff, type Scope, skeleton, splitParts } from "./diff.ts";
import { PART_NOTE, context, leadInstructions, reviewerInstructions } from "./prompts.ts";
import { USER_DIR, type Repo, branchLabel, git, parseJson } from "./repo.ts";
import type { ReviewStage } from "./rules.ts";
import {
  Answers,
  type Brief,
  Plan,
  type Review,
  Rounds,
  Simplify,
  Submitted,
  numbered,
  readThread,
  threadFor,
  threadId,
  threadKey,
  withState,
} from "./state.ts";

// What a review looks at: a plan, or a change with its files' diffs.
export type Subject =
  | { stage: "plan"; plan: string }
  | { stage: "diff"; scope: Scope; files: FileDiff[] };

// How many findings each kind of reviewer may report.
const LIMITS = { single: 5, lead: 10, part: 3 };

export const AUTH_FILE = join(USER_DIR, "auth.json");
const USER_CONFIG = join(USER_DIR, "config.json");

function readAuth(): Record<string, Credential> {
  return existsSync(AUTH_FILE) ? parseJson(AUTH_FILE, readFileSync(AUTH_FILE, "utf8")) : {};
}

function writeAuth(auth: Record<string, Credential>): void {
  mkdirSync(dirname(AUTH_FILE), { recursive: true });
  writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2), { mode: 0o600 });
}

// Credentials from `taste login`, which runs pi-ai's own login in AUTH_FILE's folder.
// API keys in the environment (ANTHROPIC_API_KEY, OPENAI_API_KEY, ...) work too.
const fileCredentials: CredentialStore = {
  read: async (id) => readAuth()[id],
  list: async () =>
    Object.entries(readAuth()).map(([providerId, c]) => ({ providerId, type: c.type })),
  modify: async (id, change) => {
    const auth = readAuth();
    const next = await change(auth[id]);
    if (next === undefined) return auth[id];
    writeAuth({ ...auth, [id]: next });
    return next;
  },
  delete: async (id) => {
    const { [id]: _removed, ...rest } = readAuth();
    writeAuth(rest);
  },
};

export function defaultModels(): Models {
  const models = createModels({ credentials: fileCredentials });
  for (const provider of builtinProviders()) models.setProvider(provider);
  return models;
}

// "provider/model", e.g. "openai/gpt-6-sol", from TASTE_MODEL or ~/.taste/config.json.
// A model from another family than the writer's gives a real second opinion.
function modelRef(): ModelRef {
  const saved = existsSync(USER_CONFIG)
    ? parseJson(USER_CONFIG, readFileSync(USER_CONFIG, "utf8")).model
    : undefined;
  const ref: unknown = process.env.TASTE_MODEL ?? saved ?? "anthropic/claude-opus-5-5";
  if (typeof ref !== "string" || !ref.includes("/"))
    throw new Error(
      `The reviewer's model must look like "provider/model" (TASTE_MODEL or ${USER_CONFIG})`,
    );
  const [provider, ...rest] = ref.split("/");
  return { provider, modelId: rest.join("/") };
}

const MAX_TOOL_LINES = 300;

function shown(lines: string[], what: string): string {
  const more = lines.length - MAX_TOOL_LINES;
  return lines.slice(0, MAX_TOOL_LINES).join("\n") + (more > 0 ? `\n... ${more} more ${what}` : "");
}

const text = (t: string) => ({ output: [{ type: "text" as const, text: t }] });

// Paths come from the model, so this is where they get checked.
function inRepo(root: string, path: string): string {
  const full = resolve(root, path);
  if (full !== root && !full.startsWith(root + sep)) throw new Error(`${path} is outside the repo`);
  return full;
}

// Every reviewer can look but never change anything. With a `head` commit they read
// the repo as it is there; without one, the working tree, new untracked files included.
function readOnlyTools(root: string, head?: string) {
  return [
    defineTool({
      name: "read_file",
      description:
        "Read a file in the repo with line numbers. Use `from` to page through long files.",
      parameters: Type.Object({ path: Type.String(), from: Type.Optional(Type.Number()) }),
      execute: async ({ path, from = 1 }) => {
        const file = inRepo(root, path);
        const body = head
          ? git(root, ["show", `${head}:${relative(root, file)}`])
          : readFileSync(file, "utf8");
        return text(
          shown(
            body
              .split("\n")
              .slice(from - 1)
              .map((line, i) => `${from + i}\t${line}`),
            "lines",
          ),
        );
      },
    }),
    defineTool({
      name: "search",
      description:
        "Search the repo's files, new ones included, with a Perl-style regular expression (\\d, \\s and \\w work), optionally under a path.",
      parameters: Type.Object({ pattern: Type.String(), path: Type.Optional(Type.String()) }),
      execute: async ({ pattern, path = "." }) => {
        inRepo(root, path);
        const where = head ? ["-e", pattern, head] : ["--untracked", "-e", pattern];
        try {
          const matches = git(root, ["grep", "-n", "-I", "-P", ...where, "--", path]).split("\n");
          // At a commit, git starts each match with the commit id, which the model doesn't need.
          return text(
            shown(head ? matches.map((m) => m.replace(`${head}:`, "")) : matches, "matches"),
          );
        } catch (err) {
          if ((err as { status?: number }).status === 1) return text("No matches.");
          throw err;
        }
      },
    }),
    defineTool({
      name: "list_files",
      description: "List the repo's files under a path, new ones included.",
      parameters: Type.Object({ path: Type.Optional(Type.String()) }),
      execute: async ({ path = "." }) => {
        inRepo(root, path);
        const list = head
          ? ["ls-tree", "-r", "--name-only", head]
          : ["ls-files", "--cached", "--others", "--exclude-standard"];
        return text(shown(git(root, [...list, "--", path]).split("\n"), "files"));
      },
    }),
    defineTool({
      name: "history",
      description: "Recent commits that touched a path: how often it changes and why.",
      parameters: Type.Object({ path: Type.String() }),
      execute: async ({ path }) => {
        inRepo(root, path);
        const log = ["log", "--oneline", "-n", "20", ...(head ? [head] : []), "--", path];
        return text(git(root, log) || "No commits.");
      },
    }),
  ];
}

function submitTool(limit: number) {
  return defineTool({
    name: "submit_review",
    description: "Submit the review. Call it once, at the end.",
    parameters: Type.Object({
      verdict: Type.Union([Type.Literal("approve"), Type.Literal("changes-requested")]),
      summary: Type.String({ description: "One or two sentences." }),
      findings: Type.Array(
        Type.Object({
          severity: Type.Union([
            Type.Literal("must-fix"),
            Type.Literal("should-fix"),
            Type.Literal("nit"),
          ]),
          rule: Type.String({ description: 'A rule id from the rules, or "other".' }),
          file: Type.String(),
          line: Type.Optional(Type.Number()),
          problem: Type.String(),
          fix: Type.String(),
          lines: Type.Optional(
            Type.Number({ description: "Lines the fix adds (positive) or removes (negative)." }),
          ),
        }),
        { maxItems: limit },
      ),
      also: Type.Optional(
        Type.Array(
          Type.Object({
            severity: Type.Union([
              Type.Literal("must-fix"),
              Type.Literal("should-fix"),
              Type.Literal("nit"),
            ]),
            rule: Type.String(),
            file: Type.String(),
            line: Type.Optional(Type.Number()),
            problem: Type.String({ description: "One sentence." }),
          }),
          { description: "Every other valid finding past the limit, one line each." },
        ),
      ),
    }),
    execute: async (review, api, ctx) => {
      await api.commit(async (tx) => {
        const submitted = await tx.doc(Submitted, api.conversationId);
        submitted.review = { ...review, also: review.also ?? [] };
        submitted.forReview = (await tx.doc(Rounds, api.conversationId)).total + 1;
      }, ctx);
      return { ...text("Review recorded."), control: { terminate: true } };
    },
  });
}

// pi's subagent pattern: each call owns a child conversation that reviews one
// part, is found again after a crash, and answers back to the lead.
function reviewPartTool(repo: Repo, parts: FileDiff[][], partReviewer: Extension) {
  return defineTool({
    name: "review_part",
    description:
      "Have a reviewer read one part of the change closely and report back its findings.",
    parameters: Type.Object({
      part: Type.String({ description: 'The part id, like "p1".' }),
      map: Type.String({ description: "Your map of the whole change." }),
      questions: Type.String({ description: "What this part's reviewer should answer." }),
    }),
    replay: "safe",
    execute: async ({ part, map, questions }, api, ctx) => {
      const files = parts[Number(part.slice(1)) - 1];
      if (!files)
        throw new Error(`There is no part ${part}; the parts are p1 to p${parts.length}.`);
      const childId = await api.commit(async (tx) => {
        const existing = (await tx.scanConversations({ ownerTaskId: api.taskId }, 1)).items[0];
        if (existing !== undefined) return existing.id;
        const created = await tx.createConversation({
          ownership: { kind: "task", taskId: api.taskId },
        });
        await configure(tx, created.id, {
          extensions: [partReviewer],
          instructions: [
            reviewerInstructions("diff", LIMITS.part),
            PART_NOTE,
            context(repo, {
              stage: "diff",
              files: files.map((f) => f.path),
              examples: true,
              evidence: false,
            }),
          ].join("\n\n"),
        });
        return created.id;
      }, ctx);
      const content = [
        `## The lead's map\n\n${map}`,
        `## Questions for this part\n\n${questions}`,
        `## Diff of ${part}\n\n\`\`\`diff\n${files.map((f) => f.diff).join("\n")}\n\`\`\``,
      ].join("\n\n");
      const child = (await api.conversation(childId, ctx))!;
      const settled = await (
        await child.submit({ type: "input", content, requestId: `part:${api.taskId}` }, ctx)
      ).wait(ctx);
      if (settled.status !== "done") throw new Error(`The reviewer of ${part} did not answer.`);
      const review = (await api.snapshot(Submitted, childId, ctx))?.review;
      if (!review)
        throw new Error(`The reviewer of ${part} finished without calling submit_review.`);
      return { ...text(JSON.stringify(review)), details: review };
    },
  });
}

const where = (f: Brief) => (f.line ? `${f.file}:${f.line}` : f.file);

const brief = (id: string, f: Brief) =>
  `${id} [${f.severity}] ${f.rule} · ${where(f)}: ${f.problem}`;

// What the reviewer gets each round: what it reviews, the plan, the writer's answers to
// its last findings and, for a change, its size and its diff or the map of its parts.
async function roundMessage(
  harness: Harness,
  repo: Repo,
  subject: Subject,
  thread: ConversationId,
  round: number,
  parts: FileDiff[][],
): Promise<string> {
  const own = await readThread(harness, thread);
  const planThread =
    subject.stage === "diff" ? await threadId(harness, threadKey(repo, "plan")) : undefined;
  const plan =
    subject.stage === "plan"
      ? subject.plan
      : planThread
        ? (await readThread(harness, planThread)).plan
        : "";
  const what = subject.stage === "plan" ? `the plan for ${branchLabel(repo)}` : subject.scope.label;
  const out = [`Review round ${round}: ${what}.`];
  out.push(plan ? `## Plan\n\n${plan}` : "## Plan\n\nNo plan was reviewed for this change.");
  const answered = own.review
    ? numbered(own.review, subject.stage).filter(({ id }) => own.answers[id])
    : [];
  if (answered.length > 0) {
    const lines = answered.map(
      ({ id, finding }) => `${brief(id, finding)}\n   Answer: ${own.answers[id]}`,
    );
    out.push(`## The writer's answers to your last findings\n\n${lines.join("\n")}`);
  }
  if (subject.stage === "plan") return out.join("\n\n");

  const { scope, files } = subject;
  // A simplify pass is about the working tree, not about a commit or a range.
  const pass = scope.head ? null : own.simplify;
  out.push(`## Size\n\n${formatBudget(budget(repo, pass, scope))}`);
  if (parts.length > 1) {
    out.push(`## The whole change in short form\n\n${skeleton(files)}`);
    out.push(
      `## Parts\n\n${parts
        .map(
          (part, i) =>
            `p${i + 1} (${part.reduce((n, f) => n + f.diff.length, 0)} characters): ${part.map((f) => f.path).join(", ")}`,
        )
        .join("\n")}`,
    );
  } else {
    out.push(`## Diff\n\n\`\`\`diff\n${parts[0].map((f) => f.diff).join("\n")}\n\`\`\``);
  }
  return out.join("\n\n");
}

// One review round of a plan or a change, durable across crashes and remembering
// earlier rounds. A change too big for one pass goes to a lead with part subagents.
export async function review(
  repo: Repo,
  subject: Subject,
  models: Models = defaultModels(),
  model: ModelRef = modelRef(),
): Promise<{ review: Review; round: number; parts: number }> {
  const ctx = BACKGROUND_CONTEXT;
  const files = subject.stage === "diff" ? subject.files : [];
  const paths = files.map((f) => f.path);
  const parts = splitParts(files);
  const isLarge = parts.length > 1;

  const tools = readOnlyTools(repo.root, subject.stage === "diff" ? subject.scope.head : undefined);
  const single = defineExtension({
    name: "taste-single",
    tools: [...tools, submitTool(LIMITS.single)],
  });
  const partReviewer = defineExtension({
    name: "taste-part",
    tools: [...tools, submitTool(LIMITS.part)],
  });
  const lead = defineExtension({
    name: "taste-lead",
    tools: [...tools, submitTool(LIMITS.lead), reviewPartTool(repo, parts, partReviewer)],
  });
  const registry = createRegistry();
  for (const extension of [single, partReviewer, lead]) registry.install(extension);

  return withState(
    repo,
    async (harness) => {
      const thread = await threadFor(harness, threadKey(repo, subject.stage));
      await thread.configure(
        {
          model,
          thinkingLevel: "high",
          cwd: repo.root,
          extensions: [isLarge ? lead : single],
          instructions: isLarge
            ? `${leadInstructions(LIMITS.lead)}\n\n${context(repo, { stage: "diff", files: paths, examples: false, evidence: true })}`
            : `${reviewerInstructions(subject.stage, LIMITS.single)}\n\n${context(repo, {
                stage: subject.stage,
                files: subject.stage === "diff" ? paths : undefined,
                examples: subject.stage === "diff",
                evidence: subject.stage === "plan",
              })}`,
        },
        ctx,
      );
      const before = await harness.snapshot(Rounds, thread.id, ctx);
      const round = (before?.rounds ?? 0) + 1;
      const number = (before?.total ?? 0) + 1;
      const content = await roundMessage(harness, repo, subject, thread.id, round, parts);
      const requestId = createHash("sha256")
        .update(`${thread.id}\n${number}`)
        .digest("hex")
        .slice(0, 32);
      const settled = await (
        await thread.submit({ type: "input", content, requestId }, ctx)
      ).wait(ctx);
      const submitted =
        settled.status === "done" ? await harness.snapshot(Submitted, thread.id, ctx) : undefined;
      const answer = submitted?.forReview === number ? submitted.review : null;
      if (!answer) {
        // Use up this number, so the next run sends a new request instead of getting this one back.
        await thread.commit(async (tx) => {
          (await tx.doc(Rounds, thread.id)).total = number;
        }, ctx);
        throw new Error(
          settled.status === "done"
            ? "The reviewer finished without calling submit_review."
            : `The reviewer did not answer: ${JSON.stringify(settled)}`,
        );
      }
      const approved = answer.verdict === "approve";
      await thread.commit(async (tx) => {
        const rounds = await tx.doc(Rounds, thread.id);
        rounds.rounds = approved ? 0 : round;
        rounds.total = number;
        (await tx.doc(Answers, thread.id)).byId = {};
        if (subject.stage === "plan") (await tx.doc(Plan, thread.id)).text = subject.plan;
        // An approved review of the working tree ends a simplify pass.
        else if (approved && !subject.scope.head) (await tx.doc(Simplify, thread.id)).pass = null;
      }, ctx);
      return { review: answer, round, parts: parts.length };
    },
    { models, registry },
  );
}

// A review as the writer reads it: the verdict, the summary, and each finding with
// its id and the writer's answer, if there is one.
export function formatReview(
  r: Review,
  stage: ReviewStage,
  {
    round = 0,
    parts = 1,
    answers = {},
  }: { round?: number; parts?: number; answers?: Record<string, string> } = {},
): string {
  const how = parts > 1 ? `, a lead and ${parts} part reviewers` : "";
  const when = round > 0 ? ` (round ${round}${how})` : "";
  const verdict = r.verdict === "approve" ? "approved" : "changes requested";
  const lines = [`${stage === "plan" ? "The plan" : "The change"}: ${verdict}${when}`, r.summary];
  numbered(r, stage).forEach(({ id, finding: f }, i) => {
    if (i === r.findings.length) lines.push("", `Also found (${r.also.length}):`);
    if ("fix" in f) {
      const size = f.lines === undefined ? "" : ` · ${f.lines > 0 ? "+" : ""}${f.lines} lines`;
      lines.push(
        "",
        `${id} [${f.severity}] ${f.rule} · ${where(f)}${size}`,
        `   Problem: ${f.problem}`,
        `   Fix: ${f.fix}`,
      );
    } else lines.push(brief(id, f));
    if (answers[id]) lines.push(`   Answer: ${answers[id]}`);
  });
  return lines.join("\n");
}

// A review for scripts: the same ids people see, with the writer's answers.
export function reviewJson(r: Review, stage: ReviewStage, answers: Record<string, string> = {}) {
  return {
    verdict: r.verdict,
    summary: r.summary,
    findings: numbered(r, stage).map(({ id, finding }) => ({
      id,
      ...finding,
      answer: answers[id],
    })),
  };
}
