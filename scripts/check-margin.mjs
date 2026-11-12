#!/usr/bin/env node
/*
  check-margin — RevaultAI

  No model may be sold for less than it costs to run.

  This exists because Wan 2.6 — the default model, the one most generations
  use — was priced at 1 credit/sec while fal charged $0.100/sec. A Studio
  credit is worth $0.064, so every second generated on Studio credits lost
  3.6 cents, and had done since the rate was set. Nothing caught it: the rate
  lived in two files, fal's price lived on fal, and no check compared them.

  Three things are checked, all arithmetic, no network:

    1. Every model whose fal cost has been measured earns more than it costs,
       at the pack with the DEEPEST discount. The cheapest credit sets the
       floor, because a creator spends credits on whatever model they like.

    2. src/lib/genModels.js agrees with MODELS in api/generate-video.js. The
       server charges from its own table, so a disagreement means the price
       shown before a job is not the price taken for it.

    3. Any model whose cost has NOT been measured is named. It cannot be
       certified either way, and saying so is the honest result — silence is
       what let the first loss run.

    4. Every rate stated in prose matches the table. The blog quotes
       per-second rates in eight places, two of them inside FAQ answers that
       become structured data on live pages. When the rates moved, all eight
       became wrong, and nothing noticed — the assistant's prices are checked
       against one source by check-help, but prose had no such rule. A price
       published to a search engine is a promise; this makes breaking it a
       build failure.

  A measured loss fails the build. Run **Model ids** on the admin page to
  measure what is unknown; it writes nothing, so the figures come back here
  by hand into src/lib/falCosts.js.
*/

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GEN_MODELS } from "../src/lib/genModels.js";
import { CREDIT_PACKS } from "../src/lib/creditPacks.js";
import { FAL_COST_PER_SECOND, FAL_COST_PER_1K_TOKENS } from "../src/lib/falCosts.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const unknown = [];

/*
  The floor. Not the average pack and not the Starter pack — the one that
  sells a credit for the least, since that is the worst case every rate has
  to survive.
*/
const floor = CREDIT_PACKS.reduce(
  (worst, p) => (p.priceCents / p.credits < worst.rate ? { pack: p, rate: p.priceCents / p.credits } : worst),
  { pack: null, rate: Infinity },
);
const centsPerCredit = floor.rate / 100;

// 1. Does each measured model cover its own cost?
for (const m of GEN_MODELS) {
  const cost = FAL_COST_PER_SECOND[m.key];
  if (cost === null || cost === undefined) {
    if (!(m.key in FAL_COST_PER_1K_TOKENS)) unknown.push(m.key);
    continue;
  }
  const revenue = m.costPerSecond * centsPerCredit;
  const margin = revenue / cost;
  if (margin < 1) {
    problems.push(
      `${m.key} loses money: you charge ${m.costPerSecond} credit/sec ` +
        `($${revenue.toFixed(3)}/sec at the ${floor.pack.key} rate) and fal charges ` +
        `$${cost.toFixed(3)}/sec — ${margin.toFixed(2)}x. ` +
        `It needs at least ${Math.ceil(cost / centsPerCredit)} credit/sec to break even.`,
    );
  }
}

/*
  2. The server table is the authority. Parsed rather than imported because
     api/generate-video.js pulls in a Supabase client and a fal client on the
     way, neither of which belongs in a build check.
*/
const server = fs.readFileSync(path.join(ROOT, "api", "generate-video.js"), "utf8");

/*
  Bounded to the MODELS object itself by matching its braces. The file holds
  a second table, REF_MODELS, keyed by the same model names — reading to the
  end of the file lets a lookup land in the wrong one, which would mean
  comparing a rate against a table that does not charge anything. That is
  not hypothetical: the first version of this check did exactly that and
  passed its own mutation test for the wrong reason.
*/
function objectAfter(src, declaration) {
  const start = src.indexOf(declaration);
  if (start === -1) return null;
  const open = src.indexOf("{", start);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === "{") depth += 1;
    else if (src[i] === "}") {
      depth -= 1;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  return null;
}

const block = objectAfter(server, "const MODELS =");
if (block === null) {
  problems.push("could not find the MODELS object in api/generate-video.js — this check is reading the wrong file or the table has been renamed");
}

for (const m of GEN_MODELS) {
  if (block === null) break;
  // Anchored at the start of a line so a key inside a nested value cannot match.
  const entry = block.match(
    new RegExp(`^  '${m.key.replace(/[.*+?^$()|[\]\\]/g, "\\$&")}':\\s*\\{([\\s\\S]*?)^  \\},`, "m"),
  );
  if (!entry) {
    problems.push(`${m.key} is offered in genModels.js but has no entry in MODELS in api/generate-video.js`);
    continue;
  }
  const found = entry[1].match(/creditsPerSecond:\s*(\d+)/);
  if (!found) {
    problems.push(`${m.key} has no creditsPerSecond in api/generate-video.js`);
  } else if (Number(found[1]) !== m.costPerSecond) {
    problems.push(
      `${m.key} is priced ${m.costPerSecond} credit/sec in genModels.js but ` +
        `${found[1]} credit/sec in api/generate-video.js — the server charges its own figure, ` +
        `so a creator would be shown one price and billed another.`,
    );
  }
}

/*
  1b. Seedance is billed per thousand tokens, where a token is
      (width x height x fps) / 1024 per second of output. That makes its
      cost depend on the ASPECT RATIO as well as the tier: 21:9 at 720p is
      1680x720, which is 31% more pixels than 16:9 and 31% more expensive.
      Counting these models as "token-priced" and moving on was the same
      hole that let Wan 2.6 run at a loss — a model nobody had done the
      arithmetic for. The widest ratio each tier offers is the one checked,
      because a creator can pick it.
*/
const FPS = 24;
const HEIGHT = { "seedance-2.0": 720, "seedance-2.5": 720, "seedance-2.0-480": 480, "seedance-2.5-480": 480 };
const WIDTH_FACTOR = { "21:9": 21 / 9, "16:9": 16 / 9, "1:1": 1, "9:16": 9 / 16 };

for (const m of GEN_MODELS) {
  const per1k = FAL_COST_PER_1K_TOKENS[m.key];
  if (per1k === undefined) continue;
  const height = HEIGHT[m.key];
  if (!height) {
    problems.push(`${m.key} is token-priced but no frame height is recorded for it, so its cost cannot be worked out`);
    continue;
  }
  // The dearest shape this tier will produce.
  const widest = (m.ratios ?? ["16:9"]).reduce(
    (worst, r) => ((WIDTH_FACTOR[r] ?? 0) > (WIDTH_FACTOR[worst] ?? 0) ? r : worst),
    (m.ratios ?? ["16:9"])[0],
  );
  const width = Math.round(height * (WIDTH_FACTOR[widest] ?? 16 / 9));
  const tokensPerSecond = (width * height * FPS) / 1024;
  const costPerSecond = (tokensPerSecond / 1000) * per1k;
  const revenue = m.costPerSecond * centsPerCredit;
  const margin = revenue / costPerSecond;
  if (margin < 1) {
    problems.push(
      `${m.key} loses money at ${widest}: ${width}x${height} is ` +
        `$${costPerSecond.toFixed(3)}/sec on fal, and ${m.costPerSecond} credit/sec earns ` +
        `$${revenue.toFixed(3)} at the ${floor.pack.key} rate — ${margin.toFixed(2)}x.`,
    );
  }
}

/*
  4. Prose. Each model is named differently in writing than in the table
     ("Wan 2.6 Fast" for wan-2.6), so the mapping is written out. Any claim
     of the form "N credits per second" is checked against the nearest model
     name before it.
*/
const PROSE_NAMES = {
  "Wan 2.6": "wan-2.6",
  "Kling 3.0": "kling-3.0",
  "Kling 4.0": "kling-4.0",
  "Seedance 2.0 Draft (480p)": "seedance-2.0-480",
  "Seedance 2.0 (720p)": "seedance-2.0",
  "Seedance 2.5 Long take, draft (480p)": "seedance-2.5-480",
  "Seedance 2.5 Long take (720p)": "seedance-2.5",
  "Veo 3.1": "veo-3.1",
  "MiniMax H3 Max Draft (480p)": "minimax-h3-480",
  "MiniMax H3 Max Standard (768p)": "minimax-h3",
  "MiniMax H3 Max 1080p": "minimax-h3-1080",
};
const rateOf = Object.fromEntries(GEN_MODELS.map((m) => [m.key, m.costPerSecond]));

const COPY_FILES = ["src/blog/posts.js"];
for (const rel of COPY_FILES) {
  const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
  // Every "N credit(s) per second" and "N credit(s) a second" in the file.
  for (const claim of text.matchAll(/(\d+) credits? (?:per|a) second/g)) {
    const stated = Number(claim[1]);
    const before = text.slice(Math.max(0, claim.index - 160), claim.index);
    // The nearest model name before the claim is the one it is about.
    let nearest = null;
    let nearestAt = -1;
    for (const [name, key] of Object.entries(PROSE_NAMES)) {
      const at = before.lastIndexOf(name);
      if (at > nearestAt) {
        nearestAt = at;
        nearest = key;
      }
    }
    if (nearest === null) continue;      // a general statement, not about one model
    if (rateOf[nearest] !== stated) {
      const line = text.slice(0, claim.index).split("\n").length;
      problems.push(
        `${rel}:${line} says ${nearest} is ${stated} credits per second, but the table charges ` +
          `${rateOf[nearest]}. Published copy and the price taken from a creator have to agree.`,
      );
    }
  }

  /*
    The worked examples too — "a 5-second take is 10 credits", "(10 seconds
    is 30)". These are the figures a reader actually budgets from, and they
    are the ones a rate change leaves behind: correcting "2 credits per
    second" while the example below it still says a ten-second take costs 20
    is the same wrong number in a friendlier sentence.
  */
  const products = [
    /(\d+)[- ]seconds? take is (\d+) credits?/g,
    /\((\d+) seconds? is (\d+)(?: credits?)?\)/g,
    /at (\d+) credits for a (\d+)[- ]second take/g,
  ];
  for (const [i, pattern] of products.entries()) {
    for (const found of text.matchAll(pattern)) {
      // The third form states credits first, duration second.
      const seconds = Number(i === 2 ? found[2] : found[1]);
      const credits = Number(i === 2 ? found[1] : found[2]);
      const before = text.slice(Math.max(0, found.index - 220), found.index);
      let nearest = null;
      let nearestAt = -1;
      for (const [name, key] of Object.entries(PROSE_NAMES)) {
        const at = before.lastIndexOf(name);
        if (at > nearestAt) {
          nearestAt = at;
          nearest = key;
        }
      }
      if (nearest === null) continue;
      const should = rateOf[nearest] * seconds;
      if (should !== credits) {
        const line = text.slice(0, found.index).split("\n").length;
        problems.push(
          `${rel}:${line} says ${seconds}s on ${nearest} costs ${credits} credits, but at ` +
            `${rateOf[nearest]} credit/sec it costs ${should}.`,
        );
      }
    }
  }
}

if (problems.length) {
  console.error("check-margin FAILED:");
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}

const measured = GEN_MODELS.filter((m) => FAL_COST_PER_SECOND[m.key] != null);
const tokenPriced = GEN_MODELS.filter((m) => m.key in FAL_COST_PER_1K_TOKENS);
let line =
  `check-margin: ${measured.length} measured models all clear cost at the ` +
  `${floor.pack.key} rate (${(centsPerCredit * 100).toFixed(1)}¢/credit), ` +
  `${tokenPriced.length} token-priced models clear it at their widest ratio, ` +
  `both price tables agree, and published copy quotes the same rates.`;
if (unknown.length) {
  line += `\n  not measured, so not certified: ${unknown.join(", ")} — run Model ids on the admin page.`;
}
console.log(line);
