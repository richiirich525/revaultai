/*
  us-spelling — RevaultAI
  Finds British spellings in source and content, and converts them on request.
  Dry run by default:
    node scripts/us-spelling.mjs
  Convert for real:
    node scripts/us-spelling.mjs --apply

  Only whole words, only in src/ and api/, never node_modules or dist. Some of
  these words also appear as variable names; a whole-word swap renames the
  declaration and its uses together, but read the dry run before applying.
*/
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const PAIRS = [
  ["colour", "color"], ["colours", "colors"], ["coloured", "colored"],
  ["theatre", "theater"], ["theatres", "theaters"],
  ["licence", "license"], ["licences", "licenses"],
  ["favourite", "favorite"], ["favourites", "favorites"],
  ["organise", "organize"], ["organised", "organized"], ["organisation", "organization"],
  ["recognise", "recognize"], ["recognised", "recognized"], ["recognisable", "recognizable"],
  ["catalogue", "catalog"], ["catalogues", "catalogs"],
  ["behaviour", "behavior"], ["behaviours", "behaviors"],
  ["centre", "center"], ["centred", "centered"], ["centres", "centers"],
  ["travelling", "traveling"], ["travelled", "traveled"],
  ["cancelled", "canceled"], ["cancelling", "canceling"],
  ["labelled", "labeled"], ["labelling", "labeling"],
  ["modelled", "modeled"], ["modelling", "modeling"],
  ["grey", "gray"], ["greyed", "grayed"],
  ["practise", "practice"], ["practised", "practiced"],
  ["analyse", "analyze"], ["analysed", "analyzed"],
  ["apologise", "apologize"], ["realise", "realize"], ["realised", "realized"],
  ["summarise", "summarize"], ["summarised", "summarized"],
  ["customise", "customize"], ["customised", "customized"],
  ["emphasise", "emphasize"], ["emphasised", "emphasized"],
  ["defence", "defense"], ["offence", "offense"],
  ["metre", "meter"], ["metres", "meters"],
  ["fibre", "fiber"], ["litre", "liter"], ["litres", "liters"],
];

const match = (word) => new RegExp(`\\b${word}\\b`, "g");
const titled = (s) => s[0].toUpperCase() + s.slice(1);

function files(dir) {
  let out = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === "us-spelling.mjs" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out = out.concat(files(p));
    else if (/\.(jsx?|mjs|css|md|html)$/.test(name)) out.push(p);
  }
  return out;
}

const apply = process.argv.includes("--apply");
const roots = ["src", "api", "scripts"].filter((d) => { try { return statSync(d).isDirectory(); } catch { return false; } });

let total = 0;
const perWord = new Map();

for (const file of roots.flatMap(files)) {
  const before = readFileSync(file, "utf8");
  let after = before;
  const hits = [];

  for (const [uk, us] of PAIRS) {
    for (const [from, to] of [[uk, us], [titled(uk), titled(us)]]) {
      const n = (after.match(match(from)) || []).length;
      if (!n) continue;
      hits.push(`${from}→${to} ×${n}`);
      perWord.set(from, (perWord.get(from) ?? 0) + n);
      total += n;
      after = after.replace(match(from), to);
    }
  }

  if (hits.length) {
    console.log(`${file}\n    ${hits.join(", ")}`);
    if (apply) writeFileSync(file, after);
  }
}

console.log(
  total === 0
    ? "\nNo British spellings found."
    : apply
      ? `\nConverted ${total} across the files above.`
      : `\n${total} to convert. Read the list, then run again with --apply.`
);
if (!apply && perWord.has("grey")) {
  console.log('Note: "grey" can be a variable name. A whole-word swap renames the declaration and its uses together, so the code still runs — but check the diff.');
}
