import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { countBranches } from "./budget.ts";
import { type Repo, configOf, git, kindOf } from "./repo.ts";

const FIX = /\b(?:fix|fixes|fixed|bug|hotfix|revert)\b/i;

type Commit = { subject: string; files: string[] };

function commitsSince(repo: Repo, since: string): Commit[] {
  const config = configOf(repo);
  const log = git(repo.root, [
    "log",
    `--since=${since}`,
    "--no-merges",
    "--name-only",
    "--format=%x1e%s",
  ]);
  return log
    .split("\x1e")
    .slice(1)
    .map((chunk) => {
      const [subject, ...files] = chunk.split("\n");
      return {
        subject,
        files: files.filter(
          (f) => f && kindOf(config, f) === "code" && existsSync(join(repo.root, f)),
        ),
      };
    });
}

// Where the repo hurts: files that change often and branch a lot, and files in
// different folders that keep changing together. Markdown, for plans and people.
export function evidence(repo: Repo, since: string, top: number): string {
  const commits = commitsSince(repo, since);
  const stats = new Map<string, { commits: number; fixes: number }>();
  for (const commit of commits) {
    for (const file of commit.files) {
      const s = stats.get(file) ?? { commits: 0, fixes: 0 };
      s.commits++;
      if (FIX.test(commit.subject)) s.fixes++;
      stats.set(file, s);
    }
  }

  const hotspots = [...stats]
    .map(([file, s]) => {
      const lines = readFileSync(join(repo.root, file), "utf8").split("\n");
      const branches = lines.reduce((sum, line) => sum + countBranches(file, line), 0);
      return { file, ...s, lines: lines.length, branches };
    })
    .sort((a, b) => b.commits * b.branches - a.commits * a.branches)
    .slice(0, top);

  const pairs = new Map<string, number>();
  for (const { files } of commits) {
    if (files.length < 2 || files.length > 20) continue;
    const sorted = [...files].sort();
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (dirname(sorted[i]) === dirname(sorted[j])) continue;
        const key = `${sorted[i]}\t${sorted[j]}`;
        pairs.set(key, (pairs.get(key) ?? 0) + 1);
      }
    }
  }
  const coupled = [...pairs]
    .filter(([, together]) => together >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, top);

  return [
    `# Evidence: ${repo.name}`,
    "",
    `From git history since ${since}: ${commits.length} commits, merges left out. Regenerate with \`taste evidence\`.`,
    "",
    "## Hotspots",
    "",
    "Files that change often and have many branches. Work here pays off most, and mess here costs most.",
    "",
    "| File | Commits | Fix commits | Lines | Branches |",
    "|---|---|---|---|---|",
    ...hotspots.map(
      (h) => `| ${h.file} | ${h.commits} | ${h.fixes} | ${h.lines} | ${h.branches} |`,
    ),
    "",
    "## Files in different folders that change together",
    "",
    "A hidden dependency: a change to one usually needs a change to the other.",
    "",
    "| File | File | Commits together |",
    "|---|---|---|",
    ...coupled.map(([key, together]) => `| ${key.replace("\t", " | ")} | ${together} |`),
    "",
  ].join("\n");
}
