import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { matchesAny, stringList } from "./rules.ts";

// The shared engine and packs.
export const TASTE_HOME = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// The person's own: logins, settings, private packs and notes for repos that
// don't have a .taste folder of their own. Like ~/.pi for pi.
export const USER_DIR = join(homedir(), ".taste");

export type Config = {
  packs: string[];
  tests: string[];
  generated: string[];
};

export type Repo = {
  root: string;
  name: string;
  // Rules and notes for this repo, kept in ~/.taste/repos until the team adopts them.
  overlay: string;
  // The same, committed inside the repo as .taste/. Wins over the overlay.
  local: string;
  // Review threads and their state; inside .git so they never show in `git status`.
  state: string;
  config: Config | undefined;
};

export const DEFAULT_TESTS = [
  "**/*_test.go",
  "**/testdata/**",
  "**/*.test.*",
  "**/*.spec.*",
  "**/__tests__/**",
  "**/__mocks__/**",
  "**/e2e/**",
  "**/test_*.py",
  "**/*_test.py",
  "**/conftest.py",
  "**/tests/**",
  "**/src/test/**",
  "**/*Test.java",
  "**/*.bats",
];

export const DEFAULT_GENERATED = [
  "**/*.pb.go",
  "**/*_gen.go",
  "**/*.gen.*",
  "**/zz_generated*",
  "**/generated/**",
  "**/*.generated.*",
  "**/dist/**",
  "**/vendor/**",
  "**/node_modules/**",
  "**/package-lock.json",
  "**/yarn.lock",
  "**/pnpm-lock.yaml",
  "**/go.sum",
];

const CODE =
  /\.(go|ts|tsx|js|jsx|mjs|cjs|py|rs|java|kt|rb|php|cs|c|cc|cpp|h|hpp|swift|scala|sh|bash|bats|vue|sql)$/;

export function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

// JSON that people edit, with errors that say which file it came from.
export function parseJson(where: string, text: string) {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`${where}: ${(err as Error).message}`);
  }
}

// People edit config.json, so this is where it gets checked. A repo's own tests and
// generated lists add to the defaults, so new defaults reach every repo.
function readConfig(file: string): Config {
  const saved = parseJson(file, readFileSync(file, "utf8"));
  const list = (key: string, optional: boolean): string[] =>
    saved[key] === undefined && optional ? [] : stringList(file, key, saved[key]);
  return {
    packs: list("packs", false),
    tests: [...DEFAULT_TESTS, ...list("tests", true)],
    generated: [...DEFAULT_GENERATED, ...list("generated", true)],
  };
}

export function openRepo(path: string): Repo {
  let root: string;
  try {
    root = git(path, ["rev-parse", "--show-toplevel"]).trim();
  } catch {
    throw new Error(`${resolve(path)} is not in a git repo`);
  }
  const name = basename(root);
  const local = join(root, ".taste");
  const overlay = join(USER_DIR, "repos", name);
  const configFile = [join(local, "config.json"), join(overlay, "config.json")].find(existsSync);
  return {
    root,
    name,
    overlay,
    local,
    state: join(resolve(root, git(root, ["rev-parse", "--git-dir"]).trim()), "taste"),
    config: configFile ? readConfig(configFile) : undefined,
  };
}

// The one place that turns "repo isn't set up" into a clear message.
export function configOf(repo: Repo): Config {
  if (!repo.config)
    throw new Error(`${repo.name} is not set up for taste. Run: taste init -C ${repo.root}`);
  return repo.config;
}

// A pack is looked up in ~/.taste/packs first (private ones, like an org's), then
// in the shared packs. The repo's own rules come last, so they win.
export function ruleDirs(repo: Repo): string[] {
  const packs = configOf(repo).packs.map((pack) => {
    const dir = [join(USER_DIR, "packs", pack), join(TASTE_HOME, "packs", pack)].find(existsSync);
    if (!dir) throw new Error(`Unknown pack "${pack}" in ${repo.name}'s config.json`);
    return dir;
  });
  return [...packs, join(repo.overlay, "rules"), join(repo.local, "rules")];
}

// The repo's own notes for agents: what's guaranteed, what's approved, what not to copy.
export function repoNotes(repo: Repo): string {
  return ["invariants.md", "patterns.md", "dont-copy.md"]
    .map((file) => [join(repo.local, file), join(repo.overlay, file)].find(existsSync))
    .filter((file) => file !== undefined)
    .map((file) => readFileSync(file, "utf8").trim())
    .join("\n\n");
}

// "code" counts toward size and complexity; "test" is counted on its own;
// generated files, docs and data are "other".
export function kindOf(config: Config, path: string): "code" | "test" | "other" {
  if (!CODE.test(path) || matchesAny(config.generated, path)) return "other";
  return matchesAny(config.tests, path) ? "test" : "code";
}

// The branch checked out, or undefined on a detached HEAD (CI checkouts, rebases).
export function branchOf(repo: Repo): string | undefined {
  try {
    return git(repo.root, ["symbolic-ref", "--short", "--quiet", "HEAD"]).trim();
  } catch {
    return undefined;
  }
}

// How messages name what's checked out: "branch main", or "detached HEAD".
export function branchLabel(repo: Repo): string {
  const branch = branchOf(repo);
  return branch ? `branch ${branch}` : "detached HEAD";
}
