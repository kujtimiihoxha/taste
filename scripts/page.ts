// Prints the sentences of a page that match a pattern, so a quote can be
// copied from the page itself.
// Usage: node scripts/page.ts <url> [pattern]   (pattern is a case-insensitive regex)
import { page } from "./text.ts";

const [url, pattern = "."] = process.argv.slice(2);
if (!url) {
  console.error("usage: node page.ts <url> [pattern]");
  process.exit(1);
}
const match = new RegExp(pattern, "i");
for (const sentence of page(url).split(/(?<=[.!?:])\s+(?=[A-Z0-9"'(“])/)) {
  if (match.test(sentence)) console.log(`- ${sentence}`);
}
