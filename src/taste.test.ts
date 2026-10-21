import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { Readable } from "node:stream";
import { onTestFinished, test } from "vite-plus/test";
import type { JsonObject, Models, TranscriptContext } from "@earendil-works/pi-ai";
import { createModels } from "@earendil-works/pi-ai/models";
import {
  type FauxResponseStep,
  fauxAssistantMessage,
  fauxProvider,
  fauxToolCall,
} from "@earendil-works/pi-ai/providers/faux";
import { main } from "./cli.ts";
import { type FileDiff, fileDiffs, scopeOf, skeleton, splitParts } from "./diff.ts";
import { TASTE_HOME, openRepo } from "./repo.ts";
import {
  type Rule,
  brokenReferences,
  globMatch,
  loadRules,
  parseRule,
  problems,
  route,
} from "./rules.ts";

// A temp folder that is removed when the test ends.
function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// A real git repo in a temp folder, set up for taste with its own .taste/config.json.
function tempRepo(files: Record<string, string>): string {
  const root = tempDir("taste-");
  const run = (...args: string[]) => execFileSync("git", args, { cwd: root });
  run("init", "-q");
  run("config", "user.email", "test@example.com");
  run("config", "user.name", "test");
  // A signing setup in the user's global config would wait for a prompt nobody answers.
  run("config", "commit.gpgsign", "false");
  mkdirSync(join(root, ".taste"));
  writeFileSync(
    join(root, ".taste", "config.json"),
    JSON.stringify({ packs: ["core", "lang/go"] }),
  );
  for (const [name, body] of Object.entries(files)) {
    mkdirSync(join(root, name, ".."), { recursive: true });
    writeFileSync(join(root, name), body);
  }
  run("add", "-A");
  run("commit", "-q", "-m", "start");
  return root;
}

// A reviewer that answers each request with the next of these steps.
function reviewer(...steps: FauxResponseStep[]): Models {
  const faux = fauxProvider({ provider: "faux", models: [{ id: "reviewer" }] });
  faux.setResponses(steps);
  const models = createModels();
  models.setProvider(faux.provider);
  return models;
}

const submit = (review: JsonObject) =>
  fauxAssistantMessage(fauxToolCall("submit_review", review), { stopReason: "toolUse" });

const approve = () => submit({ verdict: "approve", summary: "Clean.", findings: [] });

// The last message the reviewer was sent, as text.
function lastInput(context: TranscriptContext): string {
  const content = context.messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  return typeof content === "string"
    ? content
    : content.map((c) => (c.type === "text" ? c.text : "")).join("");
}

// Runs `taste -C <dir> ...args` in this process, with the faux reviewer.
async function taste(
  dir: string,
  args: string[],
  { models, stdin = "" }: { models?: Models; stdin?: string } = {},
) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await main(["-C", dir, ...args], {
    stdin: Readable.from([stdin]),
    stdout: { write: (s: string) => out.push(s) },
    stderr: { write: (s: string) => err.push(s) },
    models,
    model: { provider: "faux", modelId: "reviewer" },
  });
  return { code, out: out.join(""), err: err.join("") };
}

const STORE = `package store

func (s *Store) Rule(id string) (Rule, error) {
	r, ok := s.rules[id]
	if !ok {
		return Rule{}, ErrNotFound
	}
	return r, nil
}
`;

const NIL_CHECK = STORE.replace(
  "\tr, ok",
  "\tif s == nil {\n\t\treturn Rule{}, ErrNilStore\n\t}\n\tr, ok",
);

const FINDING = {
  severity: "must-fix",
  rule: "core/new-check-needs-a-real-input",
  file: "store.go",
  line: 4,
  problem: "Checks for a nil *Store, which no caller can pass.",
  fix: "Delete the check.",
  lines: -3,
};

const BRIEF = {
  severity: "nit",
  rule: "core/comments-say-why",
  file: "store.go",
  problem: "The comment repeats the code.",
};

test("globs match paths the way the packs use them", () => {
  assert.equal(globMatch("**/*.go", "main.go"), true);
  assert.equal(globMatch("**/*.go", "internal/store/store.go"), true);
  assert.equal(globMatch("**/*_test.go", "internal/store/store.go"), false);
  assert.equal(globMatch("**/__tests__/**", "src/__tests__/a/b.tsx"), true);
  assert.equal(globMatch("*.ts", "src/a.ts"), false);
});

const rule = (
  id: string,
  applies: string[] | "tests",
  overrides: string[] = [],
  body = "",
): Rule => ({
  id,
  title: id,
  applies,
  severity: "should-fix",
  stage: "diff",
  overrides,
  status: "",
  body,
  file: `${id}.md`,
});

test("a rule replaces another only in changes it applies to", () => {
  const rules = [rule("core/x", ["**/*"]), rule("go/x", ["**/*.go"], ["core/x"])];
  const ids = (files: string[]) =>
    route(rules, "diff", { files, touchesTests: false }).map((r) => r.id);
  assert.deepEqual(ids(["main.go"]), ["go/x"]);
  assert.deepEqual(ids(["main.py"]), ["core/x"]);
});

test("a rule that applies to tests reaches a change that touches a test file", () => {
  const rules = [rule("tests/x", "tests"), rule("java/x", ["**/*.java"])];
  const ids = (files: string[]) =>
    route(rules, "diff", { files, touchesTests: files.some((f) => f.endsWith("Test.java")) }).map(
      (r) => r.id,
    );
  assert.deepEqual(ids(["src/RuleTest.java"]), ["tests/x", "java/x"]);
  assert.deepEqual(ids(["src/Rule.java"]), ["java/x"]);
});

test("every rule in the packs is well formed and names only rules that exist", () => {
  const rules = loadRules([join(TASTE_HOME, "packs")]);
  const broken = rules.flatMap((r) => problems(r).map((p) => `${r.id}: ${p}`));
  assert.deepEqual([...broken, ...brokenReferences(rules)], []);
});

test("a rule header with a broken applies list names the file and the field", () => {
  const header = (applies: string) =>
    `---\nid: go/x\ntitle: x\napplies: ${applies}\nseverity: nit\nstage: diff\n---\nbody\n`;
  assert.throws(
    () => parseRule("x.md", header("[1]")),
    /x\.md: "applies" must be a list of strings/,
  );
  assert.throws(() => parseRule("x.md", header("**/*.go")), /x\.md: "applies" must be a JSON list/);
});

test("a rule naming a rule that doesn't exist is caught, and lint names and paths are not", () => {
  const body =
    "Like `core/gone` and ts/old-id. Not `vue/no-v-html`, tests/fixtures/a.json or `core/here`.";
  const rules = [rule("core/here", ["**/*"]), rule("go/x", ["**/*.go"], [], body)];
  assert.deepEqual(brokenReferences(rules), [
    "go/x.md: names core/gone, which is not a rule",
    "go/x.md: names ts/old-id, which is not a rule",
  ]);
});

test("a simplify pass that adds a check is over budget, one that removes code is not", async () => {
  const root = tempRepo({ "store.go": STORE });
  assert.equal((await taste(root, ["simplify"])).code, 0);

  writeFileSync(join(root, "store.go"), NIL_CHECK);
  const grown = await taste(root, ["budget", "--json"]);
  assert.equal(grown.code, 2);
  assert.deepEqual(JSON.parse(grown.out).over, [
    "3 more lines than before",
    "1 more branches (if, &&, ?., case...) than before",
  ]);

  writeFileSync(
    join(root, "store.go"),
    STORE.replace("\tif !ok {\n\t\treturn Rule{}, ErrNotFound\n\t}\n", ""),
  );
  const shrunk = await taste(root, ["budget"]);
  assert.equal(shrunk.code, 0);
  assert.match(shrunk.out, /Within budget\./);
});

test("in a simplify pass, new files and dependencies count, and files untracked before it don't", async () => {
  const root = tempRepo({ "store.go": STORE, "go.mod": "module example.com/store\n\ngo 1.24\n" });
  writeFileSync(join(root, "old.go"), "package store\n\nfunc Old() {}\n");
  await taste(root, ["simplify"]);
  writeFileSync(
    join(root, "cache.go"),
    "package store\n\nfunc NewCache() *Cache { return &Cache{} }\n",
  );
  writeFileSync(
    join(root, "go.mod"),
    "module example.com/store\n\ngo 1.24\n\nrequire github.com/samber/lo v1.47.0\n",
  );

  const { size } = JSON.parse((await taste(root, ["budget", "--json"])).out);
  assert.equal(size.filesAdded, 1);
  assert.equal(size.exportsAdded, 1);
  assert.deepEqual(size.depsAdded, ["github.com/samber/lo"]);
});

test("a review asking for changes exits 2 with numbered findings, and an approval resets the rounds", async () => {
  const root = tempRepo({ "store.go": STORE });
  writeFileSync(join(root, "store.go"), NIL_CHECK);
  const models = reviewer(
    submit({ verdict: "changes-requested", summary: "One impossible check.", findings: [FINDING] }),
    approve(),
    approve(),
  );

  const first = await taste(root, ["review", "--json"], { models });
  assert.equal(first.code, 2);
  const result = JSON.parse(first.out);
  assert.equal(result.round, 1);
  assert.deepEqual(result.findings, [{ id: "F1", ...FINDING }]);

  const second = await taste(root, ["review"], { models });
  assert.equal(second.code, 0);
  assert.match(second.out, /^The change: approved \(round 2\)/);

  assert.equal(JSON.parse((await taste(root, ["review", "--json"], { models })).out).round, 1);
});

test("a clean working tree has nothing to review and asks no model", async () => {
  const root = tempRepo({ "store.go": STORE });
  const { code, out, err } = await taste(root, ["review"], { models: reviewer() });
  assert.equal(code, 0);
  assert.match(err, /^Reviewing uncommitted changes on branch \w+: 0 files/);
  assert.equal(out, "Nothing to review.\n");
});

for (const stage of ["plan", "diff"] as const) {
  test(`${stage} reviews keep agreed fixes moving at and beyond the third-round checkpoint`, async () => {
    const root = tempRepo({ "store.go": STORE });
    writeFileSync(join(root, "store.go"), NIL_CHECK);
    const args = stage === "plan" ? ["--plan", "-"] : ["--base", "HEAD"];
    const again = `taste review ${args.join(" ")}`;
    const id = stage === "plan" ? "P1" : "F1";
    const models = reviewer(
      ...Array.from({ length: 4 }, () =>
        submit({ verdict: "changes-requested", summary: "Fix the check.", findings: [FINDING] }),
      ),
      approve(),
      approve(),
    );
    const options = { models, stdin: "# Plan: Remove the impossible check" };

    for (const expectedCode of [2, 2, 3, 3]) {
      const result = await taste(root, ["review", ...args], options);
      assert.equal(result.code, expectedCode, result.err);
      if (expectedCode === 3) {
        for (const output of [result.out, (await taste(root, ["findings"])).out]) {
          assert.match(output, /Review checkpoint/);
          assert.match(output, /Apply agreed fixes and run the relevant checks/);
          assert.match(
            output,
            /Ask the person only for unresolved disagreement or repeated findings without progress/,
          );
          assert.doesNotMatch(output, /Stop here|of 3/);
        }
      }
      assert.ok(result.out.includes(`Then run: ${again}`), result.out);
      const reply = await taste(root, ["reply", id, "fixed"]);
      assert.equal(reply.code, 0, reply.err);
    }

    const approved = await taste(root, ["review", ...args], options);
    assert.equal(approved.code, 0, approved.err);
    assert.match(approved.out, /approved \(round 5\)/);
    assert.doesNotMatch(approved.out, /Review checkpoint/);
    const reset = await taste(root, ["review", ...args, "--json"], options);
    assert.equal(reset.code, 0, reset.err);
    assert.equal(JSON.parse(reset.out).round, 1);
  });
}

test("answers go to the reviewer with the next round, and only that round", async () => {
  const root = tempRepo({ "store.go": STORE });
  writeFileSync(join(root, "store.go"), NIL_CHECK);
  const sent: string[] = [];
  const models = reviewer(
    submit({ verdict: "changes-requested", summary: "Two.", findings: [FINDING], also: [BRIEF] }),
    (context) => {
      sent.push(lastInput(context));
      return submit({ verdict: "changes-requested", summary: "One.", findings: [FINDING] });
    },
    (context) => {
      sent.push(lastInput(context));
      return approve();
    },
  );
  await taste(root, ["review"], { models });
  const saved = await taste(root, ["reply", "F2", "disagree: the comment says why, not what"]);
  assert.equal(saved.code, 0);
  await taste(root, ["review"], { models });
  await taste(root, ["review"], { models });

  assert.ok(
    sent[0].includes(
      "F2 [nit] core/comments-say-why · store.go: The comment repeats the code.\n   Answer: disagree: the comment says why, not what",
    ),
    sent[0],
  );
  assert.ok(!sent[1].includes("Answer:"), sent[1]);
});

test("a reply to an id that isn't in this thread's latest review is refused", async () => {
  const root = tempRepo({ "store.go": STORE });
  writeFileSync(join(root, "store.go"), NIL_CHECK);
  const early = await taste(root, ["reply", "F1", "fixed"]);
  assert.equal(early.code, 1);
  assert.match(early.err, /F1 answers nothing: there is no review of the change on branch \w+ in /);

  const models = reviewer(
    submit({ verdict: "changes-requested", summary: "Two.", findings: [FINDING], also: [BRIEF] }),
  );
  await taste(root, ["review"], { models });
  const past = await taste(root, ["reply", "F3", "fixed"]);
  assert.equal(past.code, 1);
  assert.match(past.err, /F3 is not a finding of the last review .* Its findings are F1 to F2\./);
  assert.equal((await taste(root, ["reply", "P1", "fixed"])).code, 1);
});

test("a plan comes from stdin or a file, and reviews of the change get the last one", async () => {
  const root = tempRepo({ "store.go": STORE });
  const sent: string[] = [];
  const saw = (context: TranscriptContext) => {
    sent.push(lastInput(context));
    return approve();
  };
  const models = reviewer(saw, saw, saw);

  const piped = await taste(root, ["review", "--plan", "-"], { models, stdin: "# Plan: piped\n" });
  assert.equal(piped.code, 0);
  assert.match(piped.out, /^The plan: approved/);
  const file = join(tempDir("plan-"), "plan.md");
  writeFileSync(file, "# Plan: from a file\n");
  await taste(root, ["review", "--plan", file], { models });
  writeFileSync(join(root, "store.go"), NIL_CHECK);
  await taste(root, ["review"], { models });

  assert.ok(sent[0].includes("## Plan\n\n# Plan: piped"), sent[0]);
  assert.ok(sent[1].includes("## Plan\n\n# Plan: from a file"), sent[1]);
  assert.ok(sent[2].includes("## Plan\n\n# Plan: from a file"), sent[2]);
});

test("untouched init templates stay out of reviewer guidance, while edited notes remain", async () => {
  const root = tempRepo({ "store.go": STORE });
  const templates = {
    "invariants.md": `# Guarantees in ${basename(root)}\n\nWhat this code already guarantees, so agents don't check it again. One line each, with where it's guaranteed.\n\n- <value> is always <state> after <function> (path/to/file:line)\n`,
    "patterns.md": `# Approved patterns in ${basename(root)}\n\nHow this repo does common things. Agents follow these, not whatever nearby code does.\n\n- <job>: <how we do it> (path/to/example)\n`,
    "dont-copy.md": `# Don't copy in ${basename(root)}\n\nPatterns that exist here but must not spread. Agents never copy these, even when nearby code does.\n\n- <pattern>: <why> (path/to/example)\n`,
  };
  for (const [name, body] of Object.entries(templates))
    writeFileSync(join(root, ".taste", name), body);
  const sent: string[] = [];
  const saw = (context: TranscriptContext) => {
    sent.push(JSON.stringify(context));
    return approve();
  };
  const models = reviewer(saw, saw);
  const first = await taste(root, ["review", "--plan", "-"], { models, stdin: "# Plan: one" });
  assert.equal(first.code, 0, first.err);
  assert.ok(!sent[0].includes("## Notes for this repo"), sent[0]);
  for (const placeholder of ["<value>", "<job>", "<pattern>"])
    assert.ok(!sent[0].includes(placeholder), sent[0]);

  writeFileSync(
    join(root, ".taste", "invariants.md"),
    templates["invariants.md"] + "\nStore.Rule always returns a value or an error.\n",
  );
  const second = await taste(root, ["review", "--plan", "-"], { models, stdin: "# Plan: two" });
  assert.equal(second.code, 0, second.err);
  assert.ok(sent[1].includes("Store.Rule always returns a value or an error."), sent[1]);
  assert.ok(sent[1].includes("<value>"), "Do not strip text from an edited note.");
});

test("findings number the plan's P1... and the change's F1..., past the limit too, with answers", async () => {
  const root = tempRepo({ "store.go": STORE });
  writeFileSync(join(root, "store.go"), NIL_CHECK);
  const models = reviewer(
    submit({ verdict: "changes-requested", summary: "Plan.", findings: [FINDING], also: [BRIEF] }),
    submit({
      verdict: "changes-requested",
      summary: "Change.",
      findings: [FINDING],
      also: [BRIEF],
    }),
  );
  await taste(root, ["review", "--plan", "-"], { models, stdin: "# Plan: one" });
  await taste(root, ["review"], { models });
  await taste(root, ["reply", "P2", "fixed"]);

  const { out } = await taste(root, ["findings"]);
  assert.ok(
    out.includes(
      "Also found (1):\nP2 [nit] core/comments-say-why · store.go: The comment repeats the code.\n   Answer: fixed",
    ),
    out,
  );
  assert.ok(out.includes("\nF1 [must-fix] core/new-check-needs-a-real-input · store.go:4"), out);
  const listed = JSON.parse((await taste(root, ["findings", "--json"])).out);
  assert.deepEqual(
    listed.plan.findings.map((f: { id: string; answer?: string }) => [f.id, f.answer]),
    [
      ["P1", undefined],
      ["P2", "fixed"],
    ],
  );
  assert.deepEqual(
    listed.diff.findings.map((f: { id: string }) => f.id),
    ["F1", "F2"],
  );
});

test("a range is reviewed as committed: the diff and the files the reviewer reads come from its head", async () => {
  const root = tempRepo({ "version.go": "package v\n\nconst Version = 1\n" });
  writeFileSync(join(root, "version.go"), "package v\n\nconst Version = 2\n");
  execFileSync("git", ["commit", "-qam", "two"], { cwd: root });
  writeFileSync(join(root, "version.go"), "package v\n\nconst Version = 3\n");
  let sent = "";
  let read = "";
  const models = reviewer(
    fauxAssistantMessage(fauxToolCall("read_file", { path: "version.go" }), {
      stopReason: "toolUse",
    }),
    (context) => {
      sent = lastInput(context);
      read = JSON.stringify(context.messages.filter((m) => m.role === "toolResult").at(-1));
      return approve();
    },
  );

  const { code, err } = await taste(root, ["review", "HEAD~1..HEAD"], { models });
  assert.equal(code, 0);
  assert.match(err, /^Reviewing HEAD~1\.\.HEAD \(\w{7}\.\.\w{7}\): 1 file\n/);
  assert.ok(sent.includes("+const Version = 2"), sent);
  assert.ok(read.includes("Version = 2"), read);
  assert.ok(!`${sent}${read}`.includes("Version = 3"), `${sent}${read}`);
  assert.match(scopeOf(openRepo(root), "HEAD").label, /^commit HEAD \(\w{7}\)$/);
});

test("-C runs taste from anywhere inside a repo, and says when a folder isn't in one", async () => {
  const root = tempRepo({ "pkg/store.go": STORE });
  const inside = await taste(join(root, "pkg"), ["status"]);
  assert.equal(inside.code, 0);
  assert.match(inside.out, new RegExp(`^${basename(root)} on branch \\w+\\n`));

  const outside = await taste(tempDir("plain-"), ["status"]);
  assert.equal(outside.code, 1);
  assert.match(outside.err, /is not in a git repo/);
});

test("unconfigured repos infer packs from a single source file without writing scaffolding", async () => {
  const root = tempRepo({
    "src/view.tsx": "export const View = () => <div />;\n",
    "package.json": '{"dependencies":{"react":"19.0.0"}}\n',
    "vendor/only.go": STORE,
    "deleted.py": "pass\n",
  });
  rmSync(join(root, ".taste"), { recursive: true });
  rmSync(join(root, "deleted.py"));
  const status = await taste(join(root, "src"), ["status"]);
  assert.equal(status.code, 0, status.err);
  assert.match(status.out, /packs:    core, tests, lang\/typescript, framework\/react\n/);
  assert.match(status.out, /automatic defaults/);
  assert.equal((await taste(root, ["plan"])).code, 0);
  assert.equal((await taste(root, ["rules"])).code, 0);
  assert.equal((await taste(root, ["budget"])).code, 0);
  const review = await taste(root, ["review", "--plan", "-"], {
    models: reviewer(approve()),
    stdin: "# Plan: use the defaults",
  });
  assert.equal(review.code, 0, review.err);
  assert.ok(!existsSync(join(root, ".taste")));
  assert.ok(!existsSync(openRepo(root).overlay));
});

test("local installation creates portable config and skills, and init preserves custom settings", async () => {
  const root = tempRepo({ "src/one.ts": "export const one = 1;\n" });
  rmSync(join(root, ".taste"), { recursive: true });
  const installed = await taste(join(root, "src"), ["install", "--local", "--codex", "--claude"]);
  assert.equal(installed.code, 0, installed.err);
  assert.deepEqual(readdirSync(join(root, ".taste")), ["config.json"]);
  const config = join(root, ".taste", "config.json");
  assert.deepEqual(JSON.parse(readFileSync(config, "utf8")), {
    packs: ["core", "tests", "lang/typescript"],
  });
  for (const agent of [".agents", ".claude"]) {
    const skill = join(root, agent, "skills", "taste", "SKILL.md");
    assert.ok(lstatSync(skill).isFile());
    assert.equal(
      readFileSync(skill, "utf8"),
      readFileSync(join(TASTE_HOME, "skill", "SKILL.md"), "utf8"),
    );
  }
  const repeated = await taste(root, ["install", "--local", "--codex", "--claude"]);
  assert.equal(repeated.code, 0, repeated.err);
  assert.match(repeated.out, /Already installed/);
  const saved = '{"packs":["core"],"tests":["**/checks/**"],"generated":["**/build/**"]}\n';
  writeFileSync(config, saved);
  assert.equal((await taste(root, ["init"])).code, 0);
  assert.equal(readFileSync(config, "utf8"), saved);
  execFileSync("git", ["add", "-A"], { cwd: root });
  execFileSync("git", ["commit", "-qm", "configure taste"], { cwd: root });
  const clone = join(tempDir("taste-clone-"), "checkout");
  execFileSync("git", ["clone", "-q", root, clone]);
  const status = await taste(clone, ["status"]);
  assert.equal(status.code, 0, status.err);
  assert.match(status.out, /packs:    core\n/);
  assert.match(status.out, /config:.*\.taste\/config.json/);
  assert.ok(existsSync(join(clone, ".agents", "skills", "taste", "SKILL.md")));
  const plan = await taste(clone, ["plan"]);
  assert.ok(!plan.out.includes("## Notes for this repo"));
});

test("install checks all conflicts before writing, and force replaces links without editing their targets", async () => {
  const root = tempRepo({ "store.go": STORE });
  rmSync(join(root, ".taste"), { recursive: true });
  const folder = join(root, ".claude", "skills", "taste");
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, "SKILL.md"), "My custom skill\n");
  const blocked = await taste(root, ["install", "--local", "--codex", "--claude"]);
  assert.equal(blocked.code, 1);
  assert.match(blocked.err, /--force/);
  assert.equal(readFileSync(join(folder, "SKILL.md"), "utf8"), "My custom skill\n");
  assert.ok(!existsSync(join(root, ".agents")));
  assert.ok(!existsSync(join(root, ".taste")));

  const source = tempDir("taste-skill-source-");
  const original = join(source, "SKILL.md");
  writeFileSync(original, "Keep the source\n");
  rmSync(folder, { recursive: true });
  symlinkSync(source, folder, "dir");
  assert.equal((await taste(root, ["install", "--local", "--claude"])).code, 1);
  const forced = await taste(root, ["install", "--local", "--claude", "--force"]);
  assert.equal(forced.code, 0, forced.err);
  assert.equal(readFileSync(original, "utf8"), "Keep the source\n");
  assert.ok(!lstatSync(folder).isSymbolicLink());
  rmSync(join(folder, "SKILL.md"));
  symlinkSync(original, join(folder, "SKILL.md"));
  assert.equal((await taste(root, ["install", "--local", "--claude", "--force"])).code, 0);
  assert.equal(readFileSync(original, "utf8"), "Keep the source\n");
  assert.ok(lstatSync(join(folder, "SKILL.md")).isFile());
});

test("noninteractive installation requires scope and agents and rejects conflicting scopes", async () => {
  const root = tempRepo({ "store.go": STORE });
  for (const args of [[], ["--local"], ["--codex"]]) {
    const result = await taste(root, ["install", ...args]);
    assert.equal(result.code, 1);
    assert.match(result.err, /noninteractive/);
  }
  const conflict = await taste(root, ["install", "--local", "--global", "--codex"]);
  assert.equal(conflict.code, 1);
  assert.match(conflict.err, /cannot be used with/);
  const outside = await taste(tempDir("taste-outside-"), ["install", "--local", "--codex"]);
  assert.equal(outside.code, 1);
  assert.match(outside.err, /not in a git repo/);
  assert.ok(!existsSync(join(root, ".agents")));
});

test("global install works outside Git and init copies raw personal overrides into the repo", () => {
  const home = tempDir("taste-home-");
  const outside = tempDir("taste-outside-");
  const run = (dir: string, ...args: string[]) =>
    spawnSync(process.execPath, [join(TASTE_HOME, "src", "cli.ts"), "-C", dir, ...args], {
      encoding: "utf8",
      timeout: 30_000,
      env: { ...process.env, HOME: home },
    });
  const global = run(outside, "install", "--global", "--codex", "--claude");
  assert.equal(global.status, 0, global.stderr);
  for (const agent of [".agents", ".claude"])
    assert.ok(existsSync(join(home, agent, "skills", "taste", "SKILL.md")));
  assert.ok(!existsSync(join(outside, ".taste")));
  assert.ok(!existsSync(join(home, ".taste")));

  const root = tempRepo({ "store.go": STORE });
  rmSync(join(root, ".taste"), { recursive: true });
  const overlay = join(home, ".taste", "repos", basename(root));
  mkdirSync(overlay, { recursive: true });
  const saved = '{"packs":["core"],"tests":["**/checks/**"],"generated":["**/build/**"]}\n';
  writeFileSync(join(overlay, "config.json"), saved);
  writeFileSync(join(overlay, "invariants.md"), "Personal guidance.\n");
  const initialized = run(root, "init");
  assert.equal(initialized.status, 0, initialized.stderr);
  assert.equal(readFileSync(join(root, ".taste", "config.json"), "utf8"), saved);
  assert.deepEqual(readdirSync(join(root, ".taste")), ["config.json"]);
  writeFileSync(join(root, ".taste", "invariants.md"), "Shared guidance.\n");
  const plan = run(root, "plan");
  assert.equal(plan.status, 0, plan.stderr);
  assert.match(plan.stdout, /Shared guidance/);
  assert.ok(!plan.stdout.includes("Personal guidance"));
});

test("bin/taste runs a real subcommand and exits with its code", () => {
  const root = tempRepo({ "store.go": STORE });
  const bin = join(TASTE_HOME, "bin", "taste");
  const run = (...args: string[]) => spawnSync(bin, args, { encoding: "utf8", timeout: 30_000 });

  const status = run("-C", root, "status");
  assert.equal(status.status, 0);
  assert.ok(status.stdout.startsWith(`${basename(root)} on branch`), status.stdout);

  assert.equal(run("-C", root, "simplify").status, 0);
  writeFileSync(join(root, "store.go"), NIL_CHECK);
  assert.equal(run("-C", root, "budget").status, 2);

  const unknown = run("-C", root, "nope");
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /unknown command 'nope'/);
});

const file = (path: string, chars: number): FileDiff => ({
  path,
  diff: "x".repeat(chars),
  added: ["x"],
  removed: [],
  isNew: false,
  isGone: false,
});

test("parts keep a folder together and stay under the limit, except one oversized file", () => {
  const parts = splitParts(
    [file("a/x.go", 40), file("a/x_test.go", 40), file("b/y.go", 50), file("c/huge.go", 300)],
    100,
  );
  assert.deepEqual(
    parts.map((p) => p.map((f) => f.path)),
    [["a/x.go", "a/x_test.go"], ["b/y.go"], ["c/huge.go"]],
  );
  assert.ok(parts[2][0].diff.startsWith("x".repeat(100) + "\n... cut here"), parts[2][0].diff);
});

test("generated files never reach a review, and copied names show in the skeleton", () => {
  const root = tempRepo({ "store.go": STORE });
  writeFileSync(join(root, "client.gen.ts"), "export const client = 1;\n");
  writeFileSync(
    join(root, "a.go"),
    "package store\n\nfunc truncate(s string) string { return s }\n",
  );
  writeFileSync(
    join(root, "b.go"),
    "package store\n\nfunc truncate(s string) string { return s[:1] }\n",
  );
  const repo = openRepo(root);
  const files = fileDiffs(repo, scopeOf(repo));
  assert.deepEqual(files.map((f) => f.path).sort(), ["a.go", "b.go"]);
  const short = skeleton(files);
  assert.ok(short.endsWith("Names added in more than one file:\ntruncate: a.go, b.go"), short);
});

test("a change too big for one pass goes to a lead, and each part reviewer sees only its part", async () => {
  const big = (n: number) => "package p\n\n" + "var x = 1\n".repeat(n);
  const root = tempRepo({ "a/a.go": "package p\n", "b/b.go": "package p\n" });
  writeFileSync(join(root, "a", "a.go"), big(10_000));
  writeFileSync(join(root, "b", "b.go"), big(10_000));
  const partSaw: string[] = [];
  const partAnswer = (context: TranscriptContext) => {
    const input = JSON.stringify(context);
    partSaw.push(
      [input.includes("a/a.go") && "a", input.includes("b/b.go") && "b"].filter(Boolean).join("+"),
    );
    return approve();
  };
  const models = reviewer(
    fauxAssistantMessage(
      [
        fauxToolCall("review_part", { part: "p1", map: "two packages", questions: "none" }),
        fauxToolCall("review_part", { part: "p2", map: "two packages", questions: "none" }),
      ],
      { stopReason: "toolUse" },
    ),
    partAnswer,
    partAnswer,
    submit({ verdict: "approve", summary: "Both parts are fine.", findings: [] }),
  );

  const { code, out } = await taste(root, ["review"], { models });
  assert.equal(code, 0);
  assert.match(
    out,
    /^The change: approved \(round 1, a lead and 2 part reviewers\)\nBoth parts are fine\./,
  );
  assert.deepEqual(partSaw.sort(), ["a", "b"]);
});

test("the reviewer's search understands \\d and \\s, the way models write regexes", async () => {
  const root = tempRepo({ "codes.go": 'package codes\n\nconst missing = "status 404"\n' });
  writeFileSync(
    join(root, "codes.go"),
    'package codes\n\nconst missing = "status 404"\nconst gone = 410\n',
  );
  let seenByModel = "";
  const models = reviewer(
    fauxAssistantMessage(fauxToolCall("search", { pattern: "status\\s\\d{3}" }), {
      stopReason: "toolUse",
    }),
    (context) => {
      seenByModel = JSON.stringify(context);
      return approve();
    },
  );

  await taste(root, ["review"], { models });
  assert.ok(seenByModel.includes("codes.go:3:"), seenByModel);
});
