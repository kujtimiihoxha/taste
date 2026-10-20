import { lstatSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import type { Io } from "./cli.ts";
import { TASTE_HOME, git, initRepo, openRepo } from "./repo.ts";

export type InstallOptions = {
  local?: boolean;
  global?: boolean;
  codex?: boolean;
  claude?: boolean;
  force?: boolean;
};

export async function install(dir: string, opts: InstallOptions, io: Io): Promise<string> {
  let scope = opts.global ? "global" : opts.local ? "local" : undefined;
  let agents = [opts.codex ? ".agents" : "", opts.claude ? ".claude" : ""].filter(Boolean);
  if (!scope || agents.length === 0) {
    if (!io.stdin.isTTY)
      throw new Error(
        "Choose --local or --global and --codex and/or --claude in a noninteractive install.",
      );
    const input = createInterface({ input: io.stdin });
    const lines = input[Symbol.asyncIterator]();
    const ask = async (prompt: string, choices: string[], fallback: string) => {
      while (true) {
        io.stderr.write(`${prompt} (${choices.join("/")}) [${fallback}]: `);
        const line = await lines.next();
        if (line.done) throw new Error("Installation cancelled.");
        const answer = line.value.trim().toLowerCase() || fallback;
        if (choices.includes(answer)) return answer;
        io.stderr.write(`Choose ${choices.join(" or ")}.\n`);
      }
    };
    try {
      if (!scope) {
        let suggested = "local";
        try {
          git(dir, ["rev-parse", "--show-toplevel"]);
        } catch {
          suggested = "global";
        }
        scope = await ask(
          "Install for this repository or all your repositories?",
          ["local", "global"],
          suggested,
        );
      }
      if (agents.length === 0) {
        const agent = await ask("Which agents?", ["codex", "claude", "both"], "both");
        agents =
          agent === "both" ? [".agents", ".claude"] : [agent === "codex" ? ".agents" : ".claude"];
      }
    } finally {
      input.close();
    }
  }

  const repo = scope === "local" ? openRepo(dir) : undefined;
  const root = repo ? repo.root : homedir();
  const skill = readFileSync(join(TASTE_HOME, "skill", "SKILL.md"), "utf8");
  // Check every destination before creating config or installing either skill.
  const destinations = agents.map((agent) => {
    const folder = join(root, agent, "skills", "taste");
    const file = join(folder, "SKILL.md");
    const directory = lstatSync(folder, { throwIfNoEntry: false });
    if (directory && !directory.isDirectory() && !directory.isSymbolicLink())
      throw new Error(`Cannot install into ${folder}: it is not a directory.`);
    const linked = directory?.isSymbolicLink() ?? false;
    const existing = linked ? undefined : lstatSync(file, { throwIfNoEntry: false });
    if (existing && !existing.isFile() && !existing.isSymbolicLink())
      throw new Error(`Cannot replace ${file}: it is not a file.`);
    const unchanged = existing?.isFile() && readFileSync(file, "utf8") === skill;
    if ((linked || (existing && !unchanged)) && !opts.force)
      throw new Error(
        `A different skill or symlink exists at ${folder}. Use --force to replace it.`,
      );
    return { folder, file, linked, linkedFile: existing?.isSymbolicLink(), unchanged };
  });

  const messages = repo ? [initRepo(repo)] : [];
  for (const { folder, file, linked, linkedFile, unchanged } of destinations) {
    if (!unchanged) {
      // Unlink the destination, never write through a symlink into its source.
      if (linked) unlinkSync(folder);
      mkdirSync(folder, { recursive: true });
      if (linkedFile) unlinkSync(file);
      writeFileSync(file, skill);
    }
    messages.push(`${unchanged ? "Already installed" : "Installed"}: ${file}`);
  }
  if (repo)
    messages.push("Commit .taste/config.json and the installed skill files to share this setup.");
  messages.push(
    "Start a new agent session to load the skill. Each machine needs Taste on PATH and its own login or API key.",
  );
  return messages.join("\n");
}
