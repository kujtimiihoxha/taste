// Checks a draft pack before a person reads it: the header and sections, that
// each quote is on its source page, and that the examples parse.
// Usage: node scripts/check-pack.ts <pack dir>...   Exits 1 when anything fails.
// A language whose tool isn't installed (Docker, ShellCheck, gofmt) is noted, not failed.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { USER_DIR } from "../src/repo.ts";
import { parseRule, problems, type Rule } from "../src/rules.ts";
import { normalize, page } from "./text.ts";

const HERE = import.meta.dirname;
const WORK = join(USER_DIR, "cache");
const PG_IMAGE = "postgres:17-alpine";
const JAVA_IMAGE = "eclipse-temurin:21-jdk";
const RUST_IMAGE = "rust:1-slim";

let failures = 0;

function say(status: "ok" | "FAIL" | "note", id: string, what: string) {
  if (status === "FAIL") failures++;
  console.log(`${status.padEnd(4)} ${id}: ${what}`);
}

function run(cmd: string, args: string[], input = "") {
  return spawnSync(cmd, args, { input, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 });
}

// parseRule keeps only what the engine needs; the provenance fields are read here.
function header(text: string): Record<string, string> {
  const fields: Record<string, string> = {};
  let key = "";
  for (const line of (/^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? "").split("\n")) {
    const colon = line.indexOf(":");
    if (/^\s/.test(line)) fields[key] = `${fields[key]} ${line.trim()}`;
    else if (colon > 0) {
      key = line.slice(0, colon).trim();
      fields[key] = line.slice(colon + 1).trim();
    }
  }
  return fields;
}

// The formatter may rewrite a quoted YAML value in either quote style.
function unquote(value: string): string {
  if (value.length > 1 && value.startsWith('"') && value.endsWith('"'))
    return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  if (value.length > 1 && value.startsWith("'") && value.endsWith("'"))
    return value.slice(1, -1).replace(/''/g, "'");
  return value;
}

function checkSource(id: string, fields: Record<string, string>) {
  const url = /https?:\/\/[^\s,;)"'<>]+/.exec(fields.source ?? "")?.[0]?.replace(/\.+$/, "");
  const quote = normalize(unquote(fields.quote ?? ""));
  const words = quote.split(" ");
  if (!url) return say("FAIL", id, "source needs the URL of the page the quote is from");
  if (words.length < 6 || words.length > 80)
    return say("FAIL", id, `quote must be one passage of 6 to 80 words, got ${words.length}`);
  let text: string;
  try {
    text = normalize(page(url));
  } catch (e) {
    return say("FAIL", id, `could not fetch ${url}: ${String(e)}`);
  }
  if (text.includes(quote)) return say("ok", id, `quote is on ${url}`);
  let matched = 0;
  while (matched < words.length && text.includes(words.slice(0, matched + 1).join(" "))) matched++;
  say("FAIL", id, `quote is NOT on ${url} (its first ${matched} of ${words.length} words are)`);
}

type Result = { errors: string[]; notes: string[] };

function checkPython(code: string): Result {
  const r = run("python3", ["-I", "-c", "import ast, sys; ast.parse(sys.stdin.read())"], code);
  return {
    errors: r.status === 0 ? [] : [r.stderr.trim().split("\n").at(-1) ?? "does not parse"],
    notes: [],
  };
}

function checkShell(code: string, good: boolean): Result {
  const syntax = run("bash", ["-n"], code);
  if (syntax.status !== 0) return { errors: [syntax.stderr.trim()], notes: [] };
  // Examples are fragments, so variables set elsewhere, or not used, don't count.
  const lint = run("shellcheck", ["-s", "bash", "-e", "SC2154,SC2034", "-f", "gcc", "-"], code);
  const found = lint.stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => l.replace(/^-:/, "line "));
  return good
    ? { errors: found.map((f) => `ShellCheck: ${f}`), notes: [] }
    : {
        errors: [],
        notes: found.map(
          (f) => `ShellCheck already flags this, so is the rule more than the lint? ${f}`,
        ),
      };
}

let pg = "";
let databases = 0;

function postgres(): string {
  if (pg) return pg;
  pg = `taste-check-pg-${process.pid}`;
  execFileSync(
    "docker",
    ["run", "-d", "--rm", "--name", pg, "-e", "POSTGRES_HOST_AUTH_METHOD=trust", PG_IMAGE],
    {
      stdio: "ignore",
    },
  );
  // The image first runs a setup server that doesn't listen on TCP; wait for the real one.
  for (let i = 0; i < 120; i++) {
    if (
      run("docker", ["exec", pg, "pg_isready", "-q", "-h", "127.0.0.1", "-U", "postgres"])
        .status === 0
    )
      break;
    run("sleep", ["0.5"]);
  }
  return pg;
}

// Each example runs for real in its own empty database. A fragment may use
// tables it doesn't create, so only syntax errors fail.
function checkSql(code: string): Result {
  const db = `example${++databases}`;
  run("docker", ["exec", postgres(), "createdb", "-U", "postgres", db]);
  const out = run(
    "docker",
    ["exec", "-i", pg, "psql", "-U", "postgres", "-d", db, "-X", "-q", "-v", "ON_ERROR_STOP=0"],
    code,
  );
  const errors = out.stderr.split("\n").filter((l) => l.includes("ERROR:"));
  return {
    errors: errors.filter((l) => l.includes("syntax error")),
    notes: errors.filter((l) => !l.includes("syntax error")),
  };
}

// Compiles each candidate file in its own folder, in one container run.
function inDocker(
  image: string,
  files: { name: string; text: string }[],
  command: string,
): string[] {
  mkdirSync(WORK, { recursive: true });
  const dir = mkdtempSync(join(WORK, "work-"));
  files.forEach(({ name, text }, i) => {
    mkdirSync(join(dir, String(i)));
    writeFileSync(join(dir, String(i), name), text);
  });
  const script = `for d in /w/*/; do echo "=== $d"; for f in "$d"*; do ${command} 2>&1; done; done`;
  const out = run("docker", [
    "run",
    "--rm",
    "-v",
    `${dir}:/w:ro`,
    image,
    "sh",
    "-c",
    script,
  ]).stdout;
  rmSync(dir, { recursive: true });
  return out.split(/^=== .*$/m).slice(1);
}

// A fragment can be a file, class members or statements. Use the first
// wrapping that parses; names defined elsewhere are fine in a fragment.
function bestWrapping(
  outputs: string[],
  isSyntax: (line: string) => boolean,
  isError: (line: string) => boolean,
): Result {
  const tried = outputs.map((o) => {
    const errors = o.split("\n").filter(isError);
    return { syntax: errors.filter(isSyntax), other: errors.filter((l) => !isSyntax(l)) };
  });
  const best =
    tried.find((t) => t.syntax.length === 0) ??
    tried.reduce((a, b) => (b.syntax.length < a.syntax.length ? b : a));
  return { errors: best.syntax, notes: best.other };
}

const JAVA_SYNTAX =
  /expected|illegal start of|not a statement|reached end of file|class, interface, enum, or record expected|unclosed|orphaned|without 'try'|without 'if'|illegal character|malformed|is not allowed here/;

function checkJava(code: string): Result {
  const lines = code.split("\n");
  const imports = lines.filter((l) => l.startsWith("import ")).join("\n");
  const body = lines.filter((l) => !l.startsWith("import ")).join("\n");
  const declaresType =
    /^(?:@\w+.*\n)*(?:(?:public|final|abstract|sealed|non-sealed|static)\s+)*(?:class|interface|record|enum)\s+\w+/m.test(
      body,
    );
  const wrappings = declaresType
    ? [body]
    : [
        `class Snippet {\n${body}\n}`,
        `class Snippet {\nvoid snippet() throws Exception {\n${body}\n}\n}`,
      ];
  const files = wrappings.map((w) => {
    const name =
      /^public\s+(?:(?:final|abstract|sealed|non-sealed)\s+)*(?:class|interface|record|enum)\s+(\w+)/m.exec(
        w,
      )?.[1] ?? "Snippet";
    return { name: `${name}.java`, text: `${imports}\n${w}` };
  });
  const outputs = inDocker(JAVA_IMAGE, files, 'javac -d /tmp/out "$f"');
  return bestWrapping(
    outputs,
    (l) => JAVA_SYNTAX.test(l),
    (l) => l.includes(": error: "),
  );
}

// rustc gives name and type errors a code (E0425); its syntax errors have none.
function checkRust(code: string): Result {
  const files = [code, `fn snippet() {\n${code}\n}`].map((text) => ({ name: "snippet.rs", text }));
  const outputs = inDocker(
    RUST_IMAGE,
    files,
    'rustc --edition 2021 --crate-type lib --emit=metadata -o /tmp/out.rmeta "$f"',
  );
  return bestWrapping(
    outputs,
    (l) => !/^error\[E\d+\]/.test(l) && !/cannot find (?:macro|attribute|derive)/.test(l),
    (l) => l.startsWith("error") && !l.includes("aborting due to"),
  );
}

// Declarations go at file level and loose statements into a function, so an
// example can show a helper next to the line that calls it.
function splitGo(code: string): string {
  const decls: string[] = [];
  const stmts: string[] = [];
  let target = stmts;
  let comments: string[] = [];
  let open = false;
  for (const line of code.split("\n")) {
    if (open) {
      target.push(line);
      open = line !== "}" && line !== ")";
      continue;
    }
    if (line.startsWith("//") || line.trim() === "") {
      comments.push(line);
      continue;
    }
    if (/^\S/.test(line)) {
      target = /^(?:func|type|var|const|import)\b/.test(line) ? decls : stmts;
      open = target === decls && /[{(]\s*$/.test(line);
    }
    target.push(...comments, line);
    comments = [];
  }
  return `package p\n${decls.join("\n")}\nfunc _() {\n${stmts.join("\n")}\n}`;
}

// gofmt parses a whole file, so a fragment needs a package line and maybe a function.
function checkGo(code: string): Result {
  const files = /^package\s/m.test(code)
    ? [code]
    : [`package p\n${code}`, splitGo(code), `package p\nfunc _() {\n${code}\n}`];
  const tried = files.map((f) => run("gofmt", ["-e"], f).stderr.trim().split("\n").filter(Boolean));
  const fewest = tried.reduce((a, b) => (b.length < a.length ? b : a));
  return { errors: fewest, notes: [] };
}

function checkJs(lang: string) {
  return (code: string): Result => {
    const r = run(
      "node",
      ["--disable-warning=ExperimentalWarning", join(HERE, "check-example.ts"), lang],
      code,
    );
    return r.status === 0
      ? JSON.parse(r.stdout)
      : { errors: [r.stderr.trim() || "the checker crashed"], notes: [] };
  };
}

// The tools each language's check runs; checks that only need node and python3 aren't listed.
const NEEDS: Record<string, string[]> = {
  go: ["gofmt"],
  bash: ["bash", "shellcheck"],
  sh: ["bash", "shellcheck"],
  shell: ["bash", "shellcheck"],
  sql: ["docker"],
  java: ["docker"],
  rust: ["docker"],
};

const seen = new Map<string, boolean>();
function installed(tool: string): boolean {
  if (!seen.has(tool)) seen.set(tool, run("sh", ["-c", `command -v ${tool}`]).status === 0);
  return seen.get(tool) === true;
}

const CHECKS: Record<string, (code: string, good: boolean) => Result> = {
  go: checkGo,
  vue: checkJs("vue"),
  ts: checkJs("ts"),
  typescript: checkJs("ts"),
  tsx: checkJs("tsx"),
  js: checkJs("js"),
  javascript: checkJs("js"),
  jsx: checkJs("jsx"),
  python: checkPython,
  py: checkPython,
  bash: checkShell,
  sh: checkShell,
  shell: checkShell,
  sql: checkSql,
  java: checkJava,
  rust: checkRust,
};

function checkExamples(id: string, body: string) {
  for (const [, kind, lang, code] of body.matchAll(
    /\*\*(Bad|Good):\*\*\s*```(\w*)\n([\s\S]*?)\n```/g,
  )) {
    const check = CHECKS[lang];
    if (!check) {
      say("note", id, `${kind}: nothing checks "${lang || "untagged"}" code`);
      continue;
    }
    const missing = (NEEDS[lang] ?? []).filter((tool) => !installed(tool));
    if (missing.length > 0) {
      say("note", id, `${kind}: not checked, needs ${missing.join(" and ")}`);
      continue;
    }
    const { errors, notes } = check(code, kind === "Good");
    for (const e of errors) say("FAIL", id, `${kind} example: ${e}`);
    for (const n of notes.slice(0, 3)) say("note", id, `${kind} example: ${n}`);
    if (errors.length === 0) say("ok", id, `${kind} example parses (${lang})`);
  }
}

for (const dir of process.argv.slice(2)) {
  const pack = basename(dir);
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .sort();
  console.log(`\n${dir}: ${files.length} rules (aim for 8 to 12)`);
  for (const name of files) {
    const text = readFileSync(join(dir, name), "utf8");
    let rule: Rule;
    try {
      rule = parseRule(join(dir, name), text);
    } catch (e) {
      say("FAIL", name, String(e));
      continue;
    }
    const fields = header(text);
    for (const p of problems(rule)) say("FAIL", rule.id, p);
    if (!rule.id.startsWith(`${pack}/`)) say("FAIL", rule.id, `id should start with "${pack}/"`);
    if (rule.status && rule.status !== "draft" && rule.status !== "retired")
      say("FAIL", rule.id, "status is draft, retired, or left out");
    if (!fields.added) say("FAIL", rule.id, "missing added: date");
    checkSource(rule.id, fields);
    if (fields.evidence) say("FAIL", rule.id, "review links go in the notes, not in the rule");
    checkExamples(rule.id, rule.body);
  }
}
if (pg) run("docker", ["stop", pg]);
console.log(failures ? `\n${failures} problem(s)` : "\nall checks passed");
process.exit(failures ? 1 : 0);
