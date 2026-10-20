import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SEVERITIES = ["must-fix", "should-fix", "nit"] as const;
const STAGES = ["plan", "diff", "both"] as const;

// What a review looks at: a plan, before any code, or the change itself.
export type ReviewStage = "plan" | "diff";

export type Rule = {
  id: string;
  title: string;
  applies: string[] | "tests";
  severity: (typeof SEVERITIES)[number];
  stage: (typeof STAGES)[number];
  overrides: string[];
  status: string;
  body: string;
  file: string;
};

const HEADER = /^---\n([\s\S]*?)\n---\n/;

// People edit rule files and config.json, so their lists are checked where they're read.
export function stringList(where: string, key: string, value: unknown): string[] {
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string"))
    throw new Error(`${where}: "${key}" must be a list of strings`);
  return value;
}

function listField(file: string, key: string, text: string): string[] {
  let value: unknown;
  try {
    // The formatter writes headers as YAML, which allows a trailing comma that JSON doesn't.
    value = JSON.parse(text.replace(/,\s*\]$/, "]"));
  } catch {
    throw new Error(`${file}: "${key}" must be a JSON list, like ["**/*.go"]`);
  }
  return stringList(file, key, value);
}

// Rule files are written by people, so this is where they get checked.
export function parseRule(file: string, text: string): Rule {
  const header = HEADER.exec(text);
  if (!header) throw new Error(`${file}: missing --- header`);
  const fields: Record<string, string> = {};
  let key = "";
  for (const line of header[1].split("\n")) {
    // A formatter may wrap a long value onto indented lines below its key.
    if (/^\s/.test(line)) {
      fields[key] = `${fields[key]} ${line.trim()}`.trim();
      continue;
    }
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    key = line.slice(0, colon).trim();
    fields[key] = line.slice(colon + 1).trim();
  }
  for (const key of ["id", "title", "applies"]) {
    if (!fields[key]) throw new Error(`${file}: missing "${key}" in header`);
  }
  const severity = SEVERITIES.find((s) => s === fields.severity);
  if (!severity) throw new Error(`${file}: severity must be one of ${SEVERITIES.join(", ")}`);
  const stage = STAGES.find((s) => s === fields.stage);
  if (!stage) throw new Error(`${file}: stage must be one of ${STAGES.join(", ")}`);
  return {
    id: fields.id,
    title: fields.title,
    applies: fields.applies === "tests" ? "tests" : listField(file, "applies", fields.applies),
    severity,
    stage,
    overrides: fields.overrides ? listField(file, "overrides", fields.overrides) : [],
    status: fields.status ?? "",
    body: text.slice(header[0].length).trim(),
    file,
  };
}

export function loadRules(dirs: string[]): Rule[] {
  return dirs.filter(existsSync).flatMap((dir) =>
    readdirSync(dir, { recursive: true, encoding: "utf8" })
      .filter((name) => name.endsWith(".md") && !name.endsWith("README.md"))
      .sort()
      .map((name) => parseRule(join(dir, name), readFileSync(join(dir, name), "utf8"))),
  );
}

// Picks the rules for one stage and, for a diff, the files it touches. A rule that
// applies to "tests" applies when the change touches a test file. A rule listed in
// another rule's `overrides` is dropped when that rule applies too.
export function route(
  rules: Rule[],
  stage: ReviewStage,
  change?: { files: string[]; touchesTests: boolean },
): Rule[] {
  const applying = rules.filter(({ applies, stage: when, status }) => {
    if (status === "retired" || (when !== "both" && when !== stage)) return false;
    if (change === undefined) return true;
    if (applies === "tests") return change.touchesTests;
    return change.files.some((f) => matchesAny(applies, f));
  });
  const replaced = new Set(applying.flatMap((r) => r.overrides));
  return applying.filter((r) => !replaced.has(r.id));
}

export function globMatch(glob: string, path: string): boolean {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      const slash = glob[i + 2] === "/";
      re += slash ? "(?:.*/)?" : ".*";
      i += slash ? 2 : 1;
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`).test(path);
}

export function matchesAny(globs: string[], path: string): boolean {
  return globs.some((glob) => globMatch(glob, path));
}

export function formatRules(rules: Rule[], withExamples: boolean): string {
  return rules
    .map((r) => {
      const body = withExamples ? r.body : r.body.replace(/\n\*\*Bad:\*\*[\s\S]*$/, "").trim();
      return `### ${r.id}: ${r.title} (${r.severity})\n\n${body}`;
    })
    .join("\n\n");
}

// A rule's text can name another rule. Only shared and TypeScript ids are checked,
// since lint names like `vue/no-v-html` look the same as ours.
const REFERENCE =
  /(?<![\w@./-])(?:core|tests|ts|typescript)\/[a-z0-9]+(?:-[a-z0-9]+)*(?![\w/-]|\.\w)/g;

export function brokenReferences(rules: Rule[]): string[] {
  const ids = new Set(rules.map((r) => r.id));
  return rules.flatMap((r) =>
    [...new Set(r.body.match(REFERENCE))]
      .filter((ref) => !ids.has(ref))
      .map((ref) => `${r.file}: names ${ref}, which is not a rule`),
  );
}

// What `taste check` reports beyond what parseRule already refuses; empty means fine.
export function problems(rule: Rule): string[] {
  const found: string[] = [];
  if (!rule.body.includes("**Don't flag:**")) found.push(`no "Don't flag" section`);
  const kinds = [...rule.body.matchAll(/\*\*(Bad|Good):\*\*\s*```/g)].map((m) => m[1]);
  if (!kinds.includes("Bad") || !kinds.includes("Good"))
    found.push("needs one Bad and one Good example");
  return found;
}
