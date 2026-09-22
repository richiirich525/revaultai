/*
  check-components — RevaultAI
  Finds components that a file uses but never imports or defines. Vite builds
  happily with these and the page only crashes when it's opened, so run this
  before every push:
    node scripts/check-components.mjs
*/
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

function files(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.jsx$/.test(n) ? [p] : [];
  });
}

// Remove only real comments: JSX {/* ... */}, block comments that begin a
// line, and // comments after a space or at the start of a line. Text inside
// strings — like accept="image/*" or a https:// link — is left alone.
function stripComments(src) {
  return src
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, "")
    .replace(/(^|[ \t;])\/\/.*$/gm, "$1");
}

let problems = 0;
for (const file of files("src")) {
  const src = stripComments(readFileSync(file, "utf8"));
  const used = new Set([...src.matchAll(/<([A-Z][A-Za-z0-9]*)[\s/>]/g)].map((m) => m[1]));
  const known = new Set();
  // One import statement at a time; style imports with no "from" are skipped.
  for (const m of src.matchAll(/^[ \t]*import\s+([^'";]+?)\s+from\s+["']/gm)) {
    const clause = m[1];
    const def = clause.match(/^([A-Za-z_$][\w$]*)/);
    if (def) known.add(def[1]);
    const named = clause.match(/\{([^}]*)\}/);
    if (named) for (const part of named[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop();
      if (name) known.add(name);
    }
    const ns = clause.match(/\*\s+as\s+([\w$]+)/);
    if (ns) known.add(ns[1]);
  }
  for (const m of src.matchAll(/(?:function|class)\s+([A-Z][\w$]*)/g)) known.add(m[1]);
  // Names unpacked in a parameter list: ({ url, Icon }) => or ({ icon: Icon }) =>
  for (const m of src.matchAll(/\(\s*\{([^{}]*)\}\s*\)\s*(?:=>|\{)/g)) {
    for (const part of m[1].split(",")) {
      const name = part.split("=")[0].split(":").pop().trim().replace(/^\.\.\./, "");
      if (/^[A-Z][\w$]*$/.test(name)) known.add(name);
    }
  }
  for (const m of src.matchAll(/(?:const|let|var)\s+([A-Z][\w$]*)\s*=/g)) known.add(m[1]);
  const missing = [...used].filter((n) => known.has(n) === false);
  if (missing.length) {
    problems += missing.length;
    console.log(`${file}: uses ${missing.join(", ")} but never imports ${missing.length === 1 ? "it" : "them"}`);
  }
}
console.log(problems ? `\n${problems} missing import${problems === 1 ? "" : "s"} — fix before pushing.` : "All components accounted for.");
process.exit(problems ? 1 : 0);
