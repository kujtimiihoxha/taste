import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { createModels } from "@earendil-works/pi-ai/models";
import {
  type Conversation,
  type ConversationId,
  type HarnessOptions,
  createRegistry,
  defineDoc,
  Harness,
} from "@earendil-works/pi-durable";
import { openNodeSqliteStorage } from "@earendil-works/pi-durable/storage/sqlite/node";
import { type Pass, startPass } from "./budget.ts";
import { type Repo, branchLabel, branchOf, configOf } from "./repo.ts";
import type { ReviewStage } from "./rules.ts";

export type Finding = {
  severity: "must-fix" | "should-fix" | "nit";
  rule: string;
  file: string;
  line?: number;
  problem: string;
  fix: string;
  lines?: number;
};

// Findings past a reviewer's limit, one line each, so none is dropped.
export type Brief = Pick<Finding, "severity" | "rule" | "file" | "line" | "problem">;

export type Review = {
  verdict: "approve" | "changes-requested";
  summary: string;
  findings: Finding[];
  also: Brief[];
};

export const REVIEW_CHECKPOINT = 3;

const ctx = BACKGROUND_CONTEXT;

// Which conversation holds each review thread: "<branch>#plan" and "<branch>#diff".
const Threads = defineDoc<{ byKey: Record<string, ConversationId> }>({
  kind: "taste.threads",
  version: 1,
  scope: "session",
  initial: () => ({ byKey: {} }),
});

// `rounds` counts reviews since approval and resets on approval; `total` never resets,
// so every review gets its own request id and a crashed one can be retried.
export const Rounds = defineDoc<{ rounds: number; total: number }>({
  kind: "taste.rounds",
  version: 1,
  scope: "conversation",
  history: "latest",
  fork: "initial",
  initial: () => ({ rounds: 0, total: 0 }),
});

// What a reviewer submitted, and for which review, kept in its own conversation.
export const Submitted = defineDoc<{ review: Review | null; forReview: number }>({
  kind: "taste.submitted",
  version: 1,
  scope: "conversation",
  history: "latest",
  fork: "initial",
  initial: () => ({ review: null, forReview: 0 }),
});

// The writer's answers to the latest review, by finding id; the next round sends
// them to the reviewer and clears them.
export const Answers = defineDoc<{ byId: Record<string, string> }>({
  kind: "taste.answers",
  version: 1,
  scope: "conversation",
  history: "latest",
  fork: "initial",
  initial: () => ({ byId: {} }),
});

// On a plan thread: the plan as last reviewed, which reviews of the change check against.
export const Plan = defineDoc<{ text: string }>({
  kind: "taste.plan",
  version: 1,
  scope: "conversation",
  history: "latest",
  fork: "initial",
  initial: () => ({ text: "" }),
});

// On a change's thread: a simplify pass in progress, which an approved review ends.
export const Simplify = defineDoc<{ pass: Pass | null }>({
  kind: "taste.simplify",
  version: 1,
  scope: "conversation",
  history: "latest",
  fork: "initial",
  initial: () => ({ pass: null }),
});

// What a thread holds, for the commands that read it.
export type Thread = {
  // Rounds without an approval so far.
  rounds: number;
  review: Review | null;
  answers: Record<string, string>;
  plan: string;
  simplify: Pass | null;
};

// Opens this clone's review state for one command and closes it after. Only a review
// needs real models and tools; every other command just reads and writes documents.
// A repo that isn't set up for taste gets no state.
export async function withState<T>(
  repo: Repo,
  use: (harness: Harness) => Promise<T>,
  options: HarnessOptions = { models: createModels(), registry: createRegistry() },
): Promise<T> {
  configOf(repo);
  mkdirSync(repo.state, { recursive: true });
  const storage = await openNodeSqliteStorage(join(repo.state, "reviews.sqlite"));
  const harness = await Harness.open(storage, options, ctx);
  try {
    return await use(harness);
  } finally {
    await harness.close(ctx);
  }
}

// Each branch has one thread for its plan and one for its change.
export function threadKey(repo: Repo, stage: ReviewStage): string {
  return `${branchOf(repo) ?? "detached"}#${stage}`;
}

export async function threadId(harness: Harness, key: string): Promise<ConversationId | undefined> {
  return (await harness.snapshot(Threads, ctx))?.byKey[key];
}

export async function threadFor(harness: Harness, key: string): Promise<Conversation> {
  const id = await threadId(harness, key);
  const existing = id ? await harness.conversation(id, ctx) : undefined;
  if (existing) return existing;
  const created = await harness.createConversation({ ownership: { kind: "ownerless" } }, ctx);
  await harness.commit(async (tx) => {
    (await tx.doc(Threads)).byKey[key] = created.id;
  }, ctx);
  return created;
}

export async function readThread(harness: Harness, id: ConversationId): Promise<Thread> {
  return {
    rounds: (await harness.snapshot(Rounds, id, ctx))?.rounds ?? 0,
    review: (await harness.snapshot(Submitted, id, ctx))?.review ?? null,
    answers: (await harness.snapshot(Answers, id, ctx))?.byId ?? {},
    plan: (await harness.snapshot(Plan, id, ctx))?.text ?? "",
    simplify: (await harness.snapshot(Simplify, id, ctx))?.pass ?? null,
  };
}

// This branch's plan and change threads, where they exist.
export async function readThreads(repo: Repo): Promise<Partial<Record<ReviewStage, Thread>>> {
  return withState(repo, async (harness) => {
    const threads: Partial<Record<ReviewStage, Thread>> = {};
    for (const stage of ["plan", "diff"] as const) {
      const id = await threadId(harness, threadKey(repo, stage));
      if (id) threads[stage] = await readThread(harness, id);
    }
    return threads;
  });
}

// Every finding of a review with its id: P1... on a plan, F1... on a change.
// Findings past the reviewer's limit come after the full ones and continue the numbers.
export function numbered(
  review: Review,
  stage: ReviewStage,
): { id: string; finding: Finding | Brief }[] {
  const prefix = stage === "plan" ? "P" : "F";
  return [...review.findings, ...review.also].map((finding, i) => ({
    id: `${prefix}${i + 1}`,
    finding,
  }));
}

// Saves the writer's answer to one finding, for the next round. The id must be a finding
// of this thread's latest review: an answer the reviewer can't match to its finding misleads it.
export async function answer(repo: Repo, id: string, text: string): Promise<ReviewStage> {
  const stage = id.startsWith("P") ? "plan" : "diff";
  const what = `${stage === "plan" ? "the plan" : "the change"} on ${branchLabel(repo)} in ${repo.root}`;
  return withState(repo, async (harness) => {
    const thread = await threadId(harness, threadKey(repo, stage));
    const review = thread && (await harness.snapshot(Submitted, thread, ctx))?.review;
    if (!thread || !review)
      throw new Error(`${id} answers nothing: there is no review of ${what} yet.`);
    const ids = numbered(review, stage).map((n) => n.id);
    if (!ids.includes(id)) {
      const open =
        ids.length > 0
          ? `Its findings are ${ids[0]} to ${ids[ids.length - 1]}.`
          : "It has no findings.";
      throw new Error(
        `${id} is not a finding of the last review of ${what}. ${open} See: taste findings`,
      );
    }
    await harness.commit(async (tx) => {
      (await tx.doc(Answers, thread)).byId[id] = text;
    }, ctx);
    return stage;
  });
}

// Starts a simplify pass on this branch's change, in place of one already running.
export async function startSimplify(repo: Repo): Promise<void> {
  const pass = startPass(repo);
  await withState(repo, async (harness) => {
    const thread = await threadFor(harness, threadKey(repo, "diff"));
    await harness.commit(async (tx) => {
      (await tx.doc(Simplify, thread.id)).pass = pass;
    }, ctx);
  });
}
