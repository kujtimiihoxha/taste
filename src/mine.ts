import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { USER_DIR } from "./repo.ts";
import { matchesAny } from "./rules.ts";

// Review bots and AI reviewers. Their comments are not human taste. Some bots
// have ordinary accounts, so a name ending in "bot" or "robot" counts too.
const BOTS = /(?:\[bot\]|[-_](?:ro)?bot)$/i;
const AI_REVIEWERS =
  /^(?:copilot|coderabbit|sourcery|codium|qodo|greptile|ellipsis|graphite|devin|gemini-code-assist|chatgpt-codex|claude|cursor)/i;
const NOISE = /^(?:lgtm|\+1|thanks?|thank you|nice|done|ok|👍)\b/i;

export type MineOptions = {
  slug: string;
  before?: string;
  after?: string;
  paths: string[];
  limit: number;
};

type GitHubComment = {
  html_url: string;
  created_at: string;
  user: { login: string; type: string } | null;
  author_association: string;
  path: string;
  line: number | null;
  original_line: number | null;
  diff_hunk: string;
  body: string;
  in_reply_to_id?: number;
};

function isHumanTaste(c: GitHubComment): boolean {
  const login = c.user?.login ?? "ghost";
  const body = c.body.trim();
  return (
    c.user?.type !== "Bot" &&
    !BOTS.test(login) &&
    !AI_REVIEWERS.test(login) &&
    c.in_reply_to_id === undefined &&
    body.length >= 15 &&
    !NOISE.test(body)
  );
}

// GitHub often answers a big listing with a 5xx, so a page gets three tries.
function fetchPage(url: string): GitHubComment[] {
  for (let attempt = 1; ; attempt++) {
    try {
      return JSON.parse(
        execFileSync("gh", ["api", url], {
          encoding: "utf8",
          maxBuffer: 64 * 1024 * 1024,
          stdio: ["ignore", "pipe", "pipe"],
        }),
      );
    } catch (err) {
      const busy = err instanceof Error && "stderr" in err && /HTTP 5\d\d/.test(String(err.stderr));
      if (!busy || attempt === 3) throw err;
      execFileSync("sleep", [String(attempt * 5)]);
    }
  }
}

// Pulls first review comments by people from a GitHub repo, in the window `after` and
// `before` set: oldest first when there's a `before`, so paging stops there, newest
// first otherwise. GitHub's `since` skips comments last updated before `after`.
export function mine(opts: MineOptions): { file: string; kept: number; seen: number } {
  const direction = opts.before ? "asc" : "desc";
  const since = opts.after ? `&since=${encodeURIComponent(opts.after)}` : "";
  const kept: object[] = [];
  let seen = 0;
  pages: for (let page = 1; ; page++) {
    const url = `repos/${opts.slug}/pulls/comments?sort=created&direction=${direction}&per_page=100&page=${page}${since}`;
    const batch = fetchPage(url);
    if (batch.length === 0) break;
    for (const c of batch) {
      seen++;
      if (opts.before && c.created_at >= opts.before) break pages;
      if (opts.after && c.created_at < opts.after) {
        if (direction === "desc") break pages;
        continue;
      }
      if (!isHumanTaste(c) || (opts.paths.length > 0 && !matchesAny(opts.paths, c.path))) continue;
      kept.push({
        url: c.html_url,
        created: c.created_at,
        reviewer: c.user?.login ?? "ghost",
        role: c.author_association,
        path: c.path,
        line: c.original_line ?? c.line,
        hunk: c.diff_hunk.split("\n").slice(-20).join("\n"),
        comment: c.body,
      });
      if (kept.length >= opts.limit) break pages;
    }
  }
  const dir = join(USER_DIR, "mined");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${opts.slug.replace("/", "__")}.jsonl`);
  writeFileSync(file, kept.map((k) => JSON.stringify(k)).join("\n") + "\n");
  return { file, kept: kept.length, seen };
}
