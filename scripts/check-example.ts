// Parses one example from stdin with the tools its ecosystem uses: Vue's own
// compiler for single-file components, Babel's parser for TypeScript and JS.
// Usage: node scripts/check-example.ts <vue|ts|tsx|js|jsx>   Prints {"errors": [], "notes": []}.
import { readFileSync } from "node:fs";
import { parse as parseCode } from "@babel/parser";
import { compileScript, compileTemplate, parse as parseSfc } from "@vue/compiler-sfc";

const lang = process.argv[2];
const code = readFileSync(0, "utf8");
const errors: string[] = [];
const notes: string[] = [];

if (lang === "vue") {
  const { descriptor, errors: sfcErrors } = parseSfc(code, { filename: "Example.vue" });
  errors.push(...sfcErrors.map(String));
  if (sfcErrors.length === 0 && (descriptor.script || descriptor.scriptSetup)) {
    try {
      compileScript(descriptor, { id: "example" });
    } catch (e) {
      // A fragment may import types from files that don't exist here.
      (/Failed to resolve|Unresolvable type/.test(String(e)) ? notes : errors).push(String(e));
    }
  }
  if (sfcErrors.length === 0 && descriptor.template) {
    const compiled = compileTemplate({
      source: descriptor.template.content,
      filename: "Example.vue",
      id: "example",
    });
    errors.push(...compiled.errors.map(String));
  }
} else {
  const ts = lang === "ts" || lang === "tsx";
  const jsx = lang === "tsx" || lang === "jsx";
  try {
    // An example is often the inside of a function or component.
    parseCode(code, {
      sourceType: "module",
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
      plugins: [...(ts ? ["typescript" as const] : []), ...(jsx ? ["jsx" as const] : [])],
    });
  } catch (e) {
    errors.push(String(e));
  }
}
console.log(JSON.stringify({ errors, notes }));
