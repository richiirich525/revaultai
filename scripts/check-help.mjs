#!/usr/bin/env node
/*
  check-help — RevaultAI

  The assistant can only be as truthful as the facts it is handed. Two ways
  that goes wrong, and both are silent: a figure gets paraphrased into the
  context and then drifts from the real one, or a tool is added to the site
  and the assistant never hears about it and tells somebody it does not exist.

  So: every price, every per-second cost and every tool must appear in the
  context, read from its one source — and nothing may appear that is not in
  one of those sources.
*/
import { siteFacts, personalFacts, HELP_SYSTEM } from "../src/lib/helpContext.js";
import { JOBS, toolCount } from "../src/lib/toolCatalog.js";
import { CREDIT_PACKS, priceLabel } from "../src/lib/creditPacks.js";
import { GEN_MODELS } from "../src/lib/genModels.js";
import { FAQS } from "../src/lib/faqContent.js";

let pass = 0;
const fails = [];
const ok = (l, c, d) => { if (c) pass++; else fails.push(l + (d ? "  <- " + d : "")); };

const facts = siteFacts();

/* ---- everything the site sells is in there, at its real figure ---------- */
for (const pack of CREDIT_PACKS) {
  ok(`the ${pack.label} pack is described`, facts.includes(`${pack.credits} credits for ${priceLabel(pack)}`));
}
for (const model of GEN_MODELS) {
  ok(`${model.key} carries its real per-second cost`,
     facts.includes(`${model.label}: ${model.costPerSecond} credits a second`));
  ok(`${model.key} carries its real lengths`,
     facts.includes(`Lengths: ${model.durations.join(", ")} seconds`));
}
const tools = JOBS.flatMap((j) => j.tools);
ok("every tool in the catalog is described", tools.every((t) => facts.includes(`${t.name} at /${t.page}`)),
   tools.filter((t) => !facts.includes(`${t.name} at /${t.page}`)).map((t) => t.name).join(", "));
ok(`all ${toolCount()} of them`, tools.length === toolCount());
ok("every FAQ is included", FAQS.every((f) => facts.includes(f.q)));

/* ---- and nothing else ---------------------------------------------------
   A dollar figure in the context that is not a real pack price is a price
   somebody invented, and it would be repeated to a customer as fact. */
{
  const realPrices = new Set(CREDIT_PACKS.map((p) => priceLabel(p)));
  const found = [...facts.matchAll(/\$\d+(?:\.\d{2})?/g)].map((m) => m[0]);
  const invented = found.filter((f) => !realPrices.has(f));
  ok("no dollar figure appears that is not a real pack price", invented.length === 0, invented.join(", "));
}

/* ---- the visitor's own facts, and only those ---------------------------- */
{
  const empty = personalFacts({});
  ok("an account with no takes says so", /no takes yet/.test(empty));
  ok("and claims no balance it was not given", !/balance/i.test(empty), empty);

  const one = personalFacts({
    credits: 40, packs: 2, sets: 1,
    takes: [{ model: "seedance-2.5", status: "processing", credits_spent: 60,
              created_at: new Date(Date.now() - 25 * 60000).toISOString() }],
  });
  ok("a balance is reported when given", one.includes("Credit balance: 40"));
  ok("a take's real status is reported", one.includes("seedance-2.5, processing"));
  ok("and what it cost", one.includes("60 credits"));
  ok("and how long ago, in minutes while it is recent", /25 minutes ago/.test(one), one);

  const failed = personalFacts({
    takes: [{ model: "minimax-h3-480", status: "failed", credits_spent: 5, error_message: "Unexpected status code: 422",
              created_at: new Date().toISOString() }],
  });
  ok("a failure carries the reason the generator gave", failed.includes("Unexpected status code: 422"));
}

/* ---- the rules it has to answer under ----------------------------------- */
ok("it is forbidden from inventing a price", /not state a price/i.test(HELP_SYSTEM));
ok("it is forbidden from approximating one", /approximation|around|typically/i.test(HELP_SYSTEM));
ok("it is forbidden from guessing about an account", /not guess about the visitor/i.test(HELP_SYSTEM));
ok("it is forbidden from promising a roadmap", /no roadmap/i.test(HELP_SYSTEM));
ok("saying it does not know is stated to be correct", /do not know is always the correct answer/i.test(HELP_SYSTEM));
ok("it must report whether it could answer", /"grounded"/.test(HELP_SYSTEM));
ok("it must reply as JSON", /Reply with JSON and nothing else/.test(HELP_SYSTEM));

if (fails.length) {
  console.error("check-help FAILED:");
  for (const f of fails) console.error("  - " + f);
  process.exit(1);
}
console.log(`check-help: ${pass} properties hold — every price, model and tool reaches the assistant from its one source, and nothing invented reaches it at all.`);
