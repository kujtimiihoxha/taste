import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type FileDiff, type Scope, fileDiffs, language } from "./diff.ts";
import { type Repo, configOf, git, kindOf, parseJson } from "./repo.ts";

// A simplify pass in progress: the working tree when it started, saved as a commit
// by `git stash create`, and the untracked files then, which that commit leaves out.
export type Pass = { base: string; untracked: string[]; at: string };

export type Size = {
  linesAdded: number;
  linesRemoved: number;
  branchesAdded: number;
  branchesRemoved: number;
  exportsAdded: number;
  exportsRemoved: number;
  filesAdded: number;
  filesRemoved: number;
  testLinesAdded: number;
  testLinesRemoved: number;
  depsAdded: string[];
  // Files that grew the most, biggest first.
  growth: { file: string; net: number }[];
};

// How much a change grew the code. In a simplify pass `over` says how it grew;
// other changes have no limit.
export type Budget = { label: string; simplify: boolean; size: Size; over: string[] };

// Rough on purpose: the same rough count before and after is enough to see growth.
const BRANCHES = {
  go: /\b(?:if|for|case|select)\b|&&|\|\|/g,
  ts: /\b(?:if|for|while|case|catch)\b|&&|\|\||\?\?|\?\./g,
  py: /\b(?:if|elif|for|while|except|and|or)\b/g,
  java: /\b(?:if|for|while|case|catch)\b|&&|\|\|/g,
  rust: /\b(?:if|for|while|match|loop)\b|&&|\|\|/g,
  shell: /\b(?:if|elif|for|while|until|case)\b|&&|\|\|/g,
  other: /\b(?:if|for|while|case|catch)\b|&&|\|\|/g,
};

const EXPORTS = {
  go: /^\s*(?:func\s+(?:\([^)]*\)\s*)?[A-Z]|type\s+[A-Z]|(?:var|const)\s+[A-Z])/,
  ts: /^\s*export\s/,
  py: /^(?:def|class)\s+[A-Za-z]/,
  java: /^\s*public\s/,
  rust: /^\s*pub\b/,
  shell: /(?!)/,
  other: /(?!)/,
};

const COMMENT = /^\s*(?:\/\/|#|\*|\/\*)/;

// Blank lines and comments don't count: squashing whitespace shouldn't pass a
// budget, and a comment that explains why shouldn't fail one.
function isCode(line: string): boolean {
  return line.trim() !== "" && !COMMENT.test(line);
}

export function countBranches(path: string, line: string): number {
  return COMMENT.test(line) ? 0 : (line.match(BRANCHES[language(path)]) ?? []).length;
}

function isExport(path: string, line: string): boolean {
  return EXPORTS[language(path)].test(line);
}

export function startPass(repo: Repo): Pass {
  return {
    base:
      git(repo.root, ["stash", "create"]).trim() || git(repo.root, ["rev-parse", "HEAD"]).trim(),
    untracked: git(repo.root, ["ls-files", "--others", "--exclude-standard"])
      .split("\n")
      .filter(Boolean),
    at: new Date().toISOString(),
  };
}

function depsOf(path: string, text: string): string[] {
  if (text === "") return [];
  if (path.endsWith("go.mod")) {
    return text
      .split("\n")
      .map((line) => /^\s*(?:require\s+)?([\w.~-]+\.[\w.~-]+(?:\/[\w.~-]+)*)\s+v\d/.exec(line)?.[1])
      .filter((name) => name !== undefined);
  }
  const pkg = parseJson(path, text);
  return ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"].flatMap(
    (field) => Object.keys(pkg[field] ?? {}),
  );
}

// A file's text at `rev`, or in the working tree without one; "" where it doesn't exist.
function fileAt(repo: Repo, rev: string | undefined, path: string): string {
  if (rev === undefined) {
    const file = join(repo.root, path);
    return existsSync(file) ? readFileSync(file, "utf8") : "";
  }
  try {
    return git(repo.root, ["show", `${rev}:${path}`]);
  } catch {
    return ""; // The file didn't exist at rev.
  }
}

// Counts what `files` add and remove. Dependency lists are read whole at both ends of `scope`.
function measure(repo: Repo, scope: Scope, files: FileDiff[]): Size {
  const config = configOf(repo);
  const size: Size = {
    linesAdded: 0,
    linesRemoved: 0,
    branchesAdded: 0,
    branchesRemoved: 0,
    exportsAdded: 0,
    exportsRemoved: 0,
    filesAdded: 0,
    filesRemoved: 0,
    testLinesAdded: 0,
    testLinesRemoved: 0,
    depsAdded: [],
    growth: [],
  };
  for (const file of files) {
    const { path } = file;
    if (path.endsWith("go.mod") || path.endsWith("package.json")) {
      const old = new Set(depsOf(path, fileAt(repo, scope.base, path)));
      const now = depsOf(path, fileAt(repo, scope.head, path));
      size.depsAdded.push(...now.filter((name) => !old.has(name)));
    }
    const kind = kindOf(config, path);
    const added = file.added.filter(isCode).length;
    const removed = file.removed.filter(isCode).length;
    if (kind === "test") {
      size.testLinesAdded += added;
      size.testLinesRemoved += removed;
    }
    if (kind !== "code") continue;
    size.linesAdded += added;
    size.linesRemoved += removed;
    size.filesAdded += file.isNew ? 1 : 0;
    size.filesRemoved += file.isGone ? 1 : 0;
    for (const line of file.added) {
      size.branchesAdded += countBranches(path, line);
      size.exportsAdded += isExport(path, line) ? 1 : 0;
    }
    for (const line of file.removed) {
      size.branchesRemoved += countBranches(path, line);
      size.exportsRemoved += isExport(path, line) ? 1 : 0;
    }
    size.growth.push({ file: path, net: added - removed });
  }
  size.growth = size.growth
    .filter((g) => g.net > 0)
    .sort((a, b) => b.net - a.net)
    .slice(0, 5);
  return size;
}

// Why a simplify pass is over budget; empty when it isn't.
function overBudget(size: Size): string[] {
  const grew = (label: string, added: number, removed: number) =>
    added > removed ? [`${added - removed} more ${label} than before`] : [];
  return [
    ...grew("lines", size.linesAdded, size.linesRemoved),
    ...grew("branches (if, &&, ?., case...)", size.branchesAdded, size.branchesRemoved),
    ...grew("exported names", size.exportsAdded, size.exportsRemoved),
    ...grew("files", size.filesAdded, size.filesRemoved),
    ...(size.depsAdded.length > 0 ? [`new dependencies: ${size.depsAdded.join(", ")}`] : []),
  ];
}

// The size of a simplify pass since it started, or else of the change in `scope`.
export function budget(repo: Repo, pass: Pass | null, scope: Scope): Budget {
  if (!pass) {
    const size = measure(repo, scope, fileDiffs(repo, scope));
    return { label: scope.label, simplify: false, size, over: [] };
  }
  const since: Scope = { base: pass.base, label: `the simplify pass since ${pass.at}` };
  // Files untracked when the pass started aren't in its commit, so they're left out
  // entirely: they aren't new, and what changes in them during the pass isn't counted.
  const changed = fileDiffs(repo, since).filter((f) => !pass.untracked.includes(f.path));
  const size = measure(repo, since, changed);
  return { label: since.label, simplify: true, size, over: overBudget(size) };
}

export function formatBudget({ label, simplify, size, over }: Budget): string {
  const row = (name: string, added: number, removed: number) =>
    `  ${name.padEnd(9)} +${String(added).padEnd(5)} -${String(removed).padEnd(5)} net ${added - removed}`;
  const lines = [
    `Size of ${label}:`,
    row("lines", size.linesAdded, size.linesRemoved),
    row("branches", size.branchesAdded, size.branchesRemoved),
    row("exports", size.exportsAdded, size.exportsRemoved),
    row("files", size.filesAdded, size.filesRemoved),
    row("tests", size.testLinesAdded, size.testLinesRemoved),
    `  new deps  ${size.depsAdded.join(", ") || "none"}`,
  ];
  if (size.growth.length > 0) {
    lines.push(`  grew most ${size.growth.map((g) => `${g.file} +${g.net}`).join(", ")}`);
  }
  if (!simplify) return lines.join("\n");
  if (over.length === 0) return [...lines, "Within budget."].join("\n");
  return [
    ...lines,
    `Over budget: ${over.join("; ")}.`,
    "A simplification should shrink the code. Cut what you added, or be ready to say what each addition is for: the reviewer decides.",
  ].join("\n");
}
