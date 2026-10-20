// Fetches a page once (cached) and turns it into text, so quotes are checked
// against what the page says, not against what someone remembers.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { USER_DIR } from "../src/repo.ts";

const CACHE = join(USER_DIR, "cache", "pages");
const BROWSER =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  shy: "",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  laquo: "«",
  raquo: "»",
  ndash: "–",
  mdash: "—",
  hellip: "…",
};

// The words of a page, the way a reader sees them.
export function readable(html: string): string {
  return (
    html
      .replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      // Inline tags sit inside words and sentences; block tags separate them.
      .replace(
        /<\/?(?:a|abbr|b|cite|code|em|i|kbd|mark|q|samp|small|span|strong|sub|sup|tt|var)\b[^>]*>/gi,
        "",
      )
      .replace(/<[^>]+>/g, " ")
      .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
      .replace(/&([a-z]+);/gi, (all, name: string) => ENTITIES[name.toLowerCase()] ?? all)
      .replace(/\s+/g, " ")
      .trim()
  );
}

// What a quote and a page are compared as: case, curly quotes, dashes and
// Markdown code marks don't count.
export function normalize(text: string): string {
  return text
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″«»]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/[`*­​]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function page(url: string): string {
  const bare = url.split("#")[0];
  const file = join(CACHE, bare.replace(/[^a-z0-9]+/gi, "_").slice(0, 180));
  if (!existsSync(file)) {
    const got = spawnSync(
      "curl",
      ["-sSfL", "--compressed", "--max-time", "60", "-A", BROWSER, bare],
      {
        encoding: "utf8",
        maxBuffer: 128 * 1024 * 1024,
      },
    );
    if (got.status !== 0) throw new Error(got.stderr.trim() || `curl exited ${got.status}`);
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(file, got.stdout);
  }
  return readable(readFileSync(file, "utf8"));
}
