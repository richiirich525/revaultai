import { JOBS, ACCESS_LABEL } from "./toolCatalog.js";
import { FAQS } from "./faqContent.js";
import { CREDIT_PACKS, priceLabel } from "./creditPacks.js";
import { GEN_MODELS } from "./genModels.js";

/*
  helpContext — RevaultAI

  Everything the site can truthfully say about itself, assembled from the
  files that already define it.

  A bought widget crawls rendered pages and answers from a snapshot. This
  reads the same data the pages are built from, so it cannot disagree with
  the site and cannot go stale: add a tool to toolCatalog.js and the
  assistant knows about it on the next deploy, with the same wording the
  Create menu uses.

  NOTHING HERE IS WRITTEN TWICE. Every figure below — what a pack costs, what
  a model costs per second, which tools need an account — is read from its one
  source. The temptation is to paraphrase for the model's benefit, and a
  paraphrased price is a price that will be wrong in a month and will be wrong
  in the one place nobody reads.

  Pure and synchronous, so a check can assert exactly what it contains.
*/

export function siteFacts() {
  const lines = [];

  lines.push("WHAT REVAULTAI IS");
  for (const faq of FAQS) lines.push(`Q: ${faq.q}\nA: ${faq.a}`);

  lines.push("");
  lines.push("WHAT YOU CAN DO HERE, BY JOB. Each tool has a page path.");
  for (const job of JOBS) {
    lines.push(`\n${job.name} — ${job.when}`);
    for (const tool of job.tools) {
      const where = tool.where ? ` (${tool.where})` : "";
      lines.push(
        `- ${tool.name} at /${tool.page}${where}. ${ACCESS_LABEL[tool.access] ?? tool.access}.` +
        ` You bring: ${tool.give}. You get: ${tool.get}. ${tool.blurb}`,
      );
    }
  }

  lines.push("");
  lines.push("CREDITS. Credits are bought in packs and spent on generation.");
  for (const pack of CREDIT_PACKS) {
    lines.push(`- ${pack.label}: ${pack.credits} credits for ${priceLabel(pack)}.`);
  }

  lines.push("");
  lines.push("WHAT A VIDEO COSTS. Credits per second, so a 5-second shot costs five times the figure below.");
  for (const model of GEN_MODELS) {
    lines.push(
      `- ${model.label}: ${model.costPerSecond} credits a second.` +
      ` Lengths: ${model.durations.join(", ")} seconds. Shapes: ${model.ratios.join(", ")}.`,
    );
  }

  return lines.join("\n");
}

/*
  What this particular person's account looks like, for the questions a
  crawler can never answer: where their credits went, why a take has not
  arrived, whether a drawing was kept.

  Facts only, and only their own. Read server-side from their rows and
  handed to the model as text; nothing a client claims about itself is
  trusted, because a visitor who can assert their own balance can assert
  somebody else's.
*/
export function personalFacts({ credits = null, takes = [], packs = 0, sets = 0 } = {}) {
  const lines = ["THIS VISITOR'S OWN ACCOUNT. Use these for questions about their work; never guess beyond them."];
  if (credits !== null) lines.push(`- Credit balance: ${credits}.`);
  lines.push(`- Characters in their Vault: ${packs}.`);
  lines.push(`- Sets of drawings made: ${sets}.`);

  if (!takes.length) {
    lines.push("- They have made no takes yet.");
    return lines.join("\n");
  }

  lines.push(`- Their ${takes.length} most recent takes, newest first:`);
  for (const take of takes) {
    const age = Math.round((Date.now() - new Date(take.created_at).getTime()) / 60000);
    const when = age < 90 ? `${age} minutes ago` : `${Math.round(age / 60)} hours ago`;
    const why = take.error_message ? ` Reason given: ${take.error_message}` : "";
    lines.push(`  - ${take.model}, ${take.status}, started ${when}, ${take.credits_spent} credits.${why}`);
  }
  return lines.join("\n");
}

/*
  The rules the answer has to follow.

  The hard one is the last: a support answer that invents a price or a feature
  is worse than no support at all, because it is wrong in the voice of the
  company. This is the same stance every vision prompt in this codebase takes
  — an uncertain answer refuses.
*/
export const HELP_SYSTEM = `You answer questions about RevaultAI for a visitor on the site. You are given everything the site knows about itself, and sometimes facts about the visitor's own account.

How to answer:
- Short. Two or three sentences usually. A list only when the answer really is a list.
- Plain and warm, the way a person who built the place would answer. No marketing language and no exclamation marks.
- American English.
- When a tool or page answers the question, name it and give its path, like /cast or /pricing, so the interface can link it.
- Do arithmetic when it helps: if they ask what a five-second Seedance 2.5 shot costs, multiply it out and say the number.

What you must not do:
- Do not state a price, a credit cost, a feature or a limit that is not in the facts you were given. Not an approximation, not "around", not "typically".
- Do not guess about the visitor's own account beyond the facts provided. If they ask about a take you cannot see, say you cannot see it and point them at /takes.
- Do not promise anything about the future: no roadmap, no "coming soon", no dates.
- Do not invent policies about refunds, payouts, rights or moderation. If the facts do not cover it, say so and point them at /contact.
- If you cannot answer from what you were given, say exactly that and suggest /contact. Saying you do not know is always the correct answer when you do not know.

Reply with JSON and nothing else:
{"answer": "what you would say", "pages": ["/cast"], "grounded": true}
"pages" lists at most three page paths you referred to, or an empty array.
"grounded" is false when you could not answer from the facts you were given. Be honest about this one: it is how the people running the site find out which questions their pages do not answer, so a false here is useful rather than a failure.`;
