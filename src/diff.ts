import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { type Repo, branchLabel, configOf, git } from "./repo.ts";
import { matchesAny } from "./rules.ts";

// What a review covers: the change from `base` to `head`, or to the working tree
// when there is no head, uncommitted work and new untracked files included.
export type Scope = { base: string; head?: string; label: string };

export type FileDiff = {
  path: string;
  // The file's part of `git diff`, as reviewers read it.
  diff: string;
  added: string[];
  removed: string[];
  isNew: boolean;
  isGone: boolean;
};

// About 40k tokens: enough for a reviewer to read closely in one pass.
export const PART_CHARS = 160_000;

const MAIN_BRANCHES = ["origin/HEAD", "origin/main", "origin/master", "main", "master"];

const DECLARES = {
  go: /^(?:func\s+(?:\([^)]*\)\s*)?|type\s+)(\w+)/,
  ts: /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\*?|class|const|let|interface|type|enum)\s+(\w+)/,
  py: /^(?:def|class)\s+(\w+)/,
  java: /^\s*(?:(?:public|protected|private|static|final|abstract|sealed|non-sealed)\s+)*(?:class|interface|record|enum)\s+(\w+)/,
  rust: /^\s*(?:pub(?:\([^)]*\))?\s+)?(?:(?:async|unsafe|const)\s+)*(?:fn|struct|enum|trait|type|mod|static|const)\s+(\w+)/,
  shell: /^(?:function\s+)?([\w-]+)\s*\(\s*\)/,
  other: /(?!)/,
};

export function language(path: string): keyof typeof DECLARES {
  if (path.endsWith(".go")) return "go";
  // A .vue file's script is TypeScript or JavaScript.
  if (/\.(?:ts|tsx|js|jsx|mjs|cjs|vue)$/.test(path)) return "ts";
  if (path.endsWith(".py")) return "py";
  if (path.endsWith(".java")) return "java";
  if (path.endsWith(".rs")) return "rust";
  if (/\.(?:sh|bash)$/.test(path)) return "shell";
  return "other";
}

const short = (id: string) => id.slice(0, 7);

// Revisions people type become commit ids here, so their text never reaches git as an option.
function commitOf(repo: Repo, rev: string): string {
  try {
    return git(repo.root, ["rev-parse", "--verify", "--end-of-options", `${rev}^{commit}`]).trim();
  } catch {
    throw new Error(`${rev} is not a commit in ${repo.name}`);
  }
}

function emptyTree(repo: Repo): string {
  return git(repo.root, ["hash-object", "-t", "tree", "/dev/null"]).trim();
}

// What to review, read the way git reads revisions: nothing for this branch and its
// uncommitted work since it left the main branch (or since `base`), a commit for that
// commit's own change, a..b for the change from a to b, a...b from where b left a.
export function scopeOf(repo: Repo, spec?: string, base?: string): Scope {
  if (spec && base) throw new Error("Give a commit, a range or --base, not two of them.");
  const range = spec?.match(/^(.*?)(\.\.\.?)(.*)$/);
  if (range) {
    const [, from, dots, to] = range;
    const head = commitOf(repo, to || "HEAD");
    const start = commitOf(repo, from || "HEAD");
    const id = dots === "..." ? git(repo.root, ["merge-base", start, head]).trim() : start;
    return { base: id, head, label: `${spec} (${short(id)}..${short(head)})` };
  }
  if (spec) {
    const head = commitOf(repo, spec);
    const parent = git(repo.root, ["log", "-1", "--format=%P", head]).trim().split(" ")[0];
    const name = head.startsWith(spec) ? short(head) : `${spec} (${short(head)})`;
    return { base: parent || emptyTree(repo), head, label: `commit ${name}` };
  }
  const on = branchLabel(repo);
  if (base) {
    const id = commitOf(repo, base);
    return { base: id, label: `${on} vs ${base}@${short(id)} plus uncommitted changes` };
  }
  let head: string;
  try {
    head = git(repo.root, ["rev-parse", "--verify", "HEAD"]).trim();
  } catch {
    return { base: emptyTree(repo), label: `${on}, which has no commits yet` };
  }
  for (const main of MAIN_BRANCHES) {
    let id: string;
    try {
      id = git(repo.root, ["merge-base", "HEAD", main]).trim();
    } catch {
      continue; // This repo has no such branch.
    }
    if (id === head) break; // On the main branch itself, or nothing committed past it.
    const name = git(repo.root, ["rev-parse", "--abbrev-ref", main]).trim();
    return { base: id, label: `${on} vs ${name}@${short(id)} plus uncommitted changes` };
  }
  return { base: head, label: `uncommitted changes on ${on}` };
}

function parse(path: string, diff: string): FileDiff {
  const hunks = diff.indexOf("\n@@");
  const header = hunks < 0 ? diff : diff.slice(0, hunks);
  const lines = hunks < 0 ? [] : diff.slice(hunks + 1).split("\n");
  return {
    path,
    diff,
    added: lines.filter((l) => l.startsWith("+")).map((l) => l.slice(1)),
    removed: lines.filter((l) => l.startsWith("-")).map((l) => l.slice(1)),
    isNew: /^new file/m.test(header),
    isGone: /^deleted file/m.test(header),
  };
}

// Each changed file's diff in `scope`; in the working tree, new untracked files count
// as added. Generated files are left out here, so nothing after this sees them.
export function fileDiffs(repo: Repo, scope: Scope): FileDiff[] {
  const { generated } = configOf(repo);
  const ends = scope.head ? [scope.base, scope.head] : [scope.base];
  const tracked = git(repo.root, ["diff", "-M", "--no-color", "--no-ext-diff", ...ends])
    .split(/^(?=diff --git )/m)
    .filter(Boolean)
    .map((chunk) => {
      const header = chunk.slice(0, chunk.indexOf("\n")); // diff --git a/<path> b/<path>
      return parse(header.slice(header.lastIndexOf(" b/") + 3), chunk);
    });
  const untracked = scope.head
    ? []
    : git(repo.root, ["ls-files", "--others", "--exclude-standard"])
        .split("\n")
        .filter(Boolean)
        .flatMap((path) => {
          const body = readFileSync(join(repo.root, path), "utf8");
          if (body.includes("\0")) return []; // binary
          const lines = body.replace(/\n$/, "").split("\n");
          return [
            parse(
              path,
              [
                `diff --git a/${path} b/${path}`,
                "new file (untracked)",
                `@@ -0,0 +1,${lines.length} @@`,
                ...lines.map((l) => `+${l}`),
              ].join("\n"),
            ),
          ];
        });
  return [...tracked, ...untracked].filter((f) => !matchesAny(generated, f.path));
}

// Packs files into parts of at most `limit` characters, keeping each folder's
// files together where they fit. A file bigger than a part gets a part of its own, cut there.
export function splitParts(files: FileDiff[], limit = PART_CHARS): FileDiff[][] {
  const byFolder = new Map<string, FileDiff[]>();
  for (const file of files) {
    const folder = dirname(file.path).replace(/\/__tests__$/, "");
    byFolder.set(folder, [...(byFolder.get(folder) ?? []), file]);
  }
  const parts: FileDiff[][] = [];
  let current: FileDiff[] = [];
  let size = 0;
  const flush = () => {
    if (current.length > 0) parts.push(current);
    current = [];
    size = 0;
  };
  for (const [, group] of [...byFolder].sort(([a], [b]) => a.localeCompare(b))) {
    if (size + group.reduce((n, f) => n + f.diff.length, 0) > limit) flush();
    for (const file of group) {
      if (file.diff.length > limit) {
        flush();
        parts.push([
          {
            ...file,
            diff: `${file.diff.slice(0, limit)}\n... cut here; read the rest of the file with read_file`,
          },
        ]);
      } else {
        if (size + file.diff.length > limit) flush();
        current.push(file);
        size += file.diff.length;
      }
    }
  }
  flush();
  return parts;
}

function declaredNames(file: FileDiff): string[] {
  const declares = DECLARES[language(file.path)];
  return file.added.map((l) => declares.exec(l)?.[1]).filter((name) => name !== undefined);
}

// The whole change in short form, for the lead reviewer: every file, its size,
// the names it adds, and names added in more than one file (often a copied helper).
export function skeleton(files: FileDiff[]): string {
  const where = new Map<string, string[]>();
  const lines = files.map((file) => {
    const names = declaredNames(file);
    for (const name of new Set(names)) where.set(name, [...(where.get(name) ?? []), file.path]);
    const shown =
      names.length > 0
        ? `: ${names.slice(0, 20).join(", ")}${names.length > 20 ? ", ..." : ""}`
        : "";
    return `${file.path} (+${file.added.length} -${file.removed.length})${shown}`;
  });
  const repeated = [...where].filter(([, paths]) => paths.length > 1);
  if (repeated.length > 0) {
    lines.push("", "Names added in more than one file:");
    lines.push(...repeated.map(([name, paths]) => `${name}: ${paths.join(", ")}`));
  }
  return lines.join("\n");
}
