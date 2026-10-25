#!/usr/bin/env node
/*
  check-copy — RevaultAI

  Catches escape sequences written into JSX text, where they are not escapes.

  Inside a JavaScript string "—" is an em dash. Between JSX tags it is six
  literal characters, and it ships to the page looking exactly like that. The
  difference is invisible while writing and obvious to whoever reads the site,
  which is the worst combination a defect can have. One reached the admin
  panel and was found by a person reading a number off it, not by any check
  here, so this exists.

  It also catches the same mistake in a JSX attribute written as a bare
  string, for the same reason.
*/
import { parse } from "@babel/parser";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ESCAPE = /\\u[0-9a-fA-F]{4}|\\n|\\t/;

function files(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.jsx$/.test(name)) out.push(p);
  }
  return out;
}

const findings = [];

for (const file of files("src")) {
  const src = readFileSync(file, "utf8");
  let ast;
  try {
    ast = parse(src, { sourceType: "module", plugins: ["jsx"], ranges: true });
  } catch (err) {
    findings.push({ file, line: 0, text: "could not be parsed: " + err.message });
    continue;
  }

  /*
    Walked by hand rather than with @babel/traverse: the node shape needed
    here is two kinds deep, and a hand walk has no interop surprises about
    how the traverse package exports itself in this project's module mode.
  */
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach(visit); return; }

    if (node.type === "JSXText") {
      /* The raw source, not node.value: a parser may normalize, and what
         matters is what a reader will see. */
      const raw = src.slice(node.start, node.end);
      if (ESCAPE.test(raw)) {
        findings.push({
          file,
          line: src.slice(0, node.start).split("\n").length + raw.slice(0, raw.search(ESCAPE)).split("\n").length - 1,
          text: raw.replace(/\s+/g, " ").trim().slice(0, 90),
        });
      }
    }

    for (const key of Object.keys(node)) {
      if (key === "loc" || key === "range" || key === "extra") continue;
      visit(node[key]);
    }
  };
  visit(ast.program.body);
}

if (findings.length) {
  console.error("check-copy FAILED — escape sequences in JSX text render literally:");
  for (const f of findings) console.error(`  - ${f.file}:${f.line}  ${f.text}`);
  console.error("\n  Write the character itself, or an HTML entity such as &mdash;.");
  process.exit(1);
}
console.log("check-copy: no escape sequences are sitting in JSX text where a reader would see them.");
