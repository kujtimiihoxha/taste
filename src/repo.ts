import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRules, matchesAny, stringList } from "./rules.ts";

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
  config: Config;
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

function inferredConfig(root: string): Config {
  const files = git(root, ["ls-files", "-z", "--cached", "--others", "--exclude-standard"])
    .split("\0")
    .filter((file) => file && !matchesAny(DEFAULT_GENERATED, file) && existsSync(join(root, file)));
  const matching = (pack: string) =>
    loadRules([join(TASTE_HOME, "packs", pack)]).some(
      ({ applies }) => applies !== "tests" && files.some((file) => matchesAny(applies, file)),
    );
  const languages = readdirSync(join(TASTE_HOME, "packs", "lang"))
    .sort()
    .map((name) => `lang/${name}`);
  const packs = ["core", "tests", ...languages.filter(matching)];
  const manifests = files
    .filter((file) => basename(file) === "package.json")
    .map((file) => readFileSync(join(root, file), "utf8"));
  for (const framework of ["react", "vue"]) {
    if (
      matching(`framework/${framework}`) &&
      manifests.some((manifest) => manifest.includes(`"${framework}":`))
    )
      packs.push(`framework/${framework}`);
  }
  return { packs, tests: DEFAULT_TESTS, generated: DEFAULT_GENERATED };
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
    config: configFile ? readConfig(configFile) : inferredConfig(root),
  };
}

export function configOf(repo: Repo): Config {
  return repo.config;
}

export function initRepo(repo: Repo): string {
  const file = join(repo.local, "config.json");
  if (existsSync(file)) return `Kept existing configuration: ${file}`;
  const personal = join(repo.overlay, "config.json");
  // Copy saved overrides, not readConfig's merged defaults.
  const saved = existsSync(personal)
    ? readFileSync(personal, "utf8")
    : JSON.stringify({ packs: repo.config.packs }, null, 2) + "\n";
  mkdirSync(repo.local, { recursive: true });
  writeFileSync(file, saved, { flag: "wx" });
  return `Created ${file} with packs: ${repo.config.packs.join(", ")}.\nCommit .taste/config.json to share this setup. Notes and custom rules are optional.`;
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
  // Older init versions wrote these examples as live notes. Only skip an
  // untouched template; an edited note belongs to the user.
  const templates = {
    "invariants.md": `# Guarantees in ${repo.name}\n\nWhat this code already guarantees, so agents don't check it again. One line each, with where it's guaranteed.\n\n- <value> is always <state> after <function> (path/to/file:line)`,
    "patterns.md": `# Approved patterns in ${repo.name}\n\nHow this repo does common things. Agents follow these, not whatever nearby code does.\n\n- <job>: <how we do it> (path/to/example)`,
    "dont-copy.md": `# Don't copy in ${repo.name}\n\nPatterns that exist here but must not spread. Agents never copy these, even when nearby code does.\n\n- <pattern>: <why> (path/to/example)`,
  };
  return Object.entries(templates)
    .map(([name, template]) => {
      const file = [join(repo.local, name), join(repo.overlay, name)].find(existsSync);
      if (!file) return "";
      const note = readFileSync(file, "utf8").trim();
      return note === template ? "" : note;
    })
    .filter(Boolean)
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
