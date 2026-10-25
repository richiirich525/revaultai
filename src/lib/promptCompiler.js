import { styleById, protectedTermIn } from "./stylePresets.js";

/*
  promptCompiler — RevaultAI

  Turns one or more character packs, a scene and a style into the prompt a
  model actually receives.

  The shape is four labeled blocks, always in this order:

    [PACK]      who is in it, verbatim from locked fields
    [SCENE]     what happens, from a template with the creator's slots filled
    [STYLE]     how it looks, resolved from a preset id
    [NEGATIVE]  the drift guards

  Three properties matter more than anything else here, and each one is a bug
  that would otherwise appear months later and be blamed on the model.

  1. THE PACK BLOCK IS DETERMINISTIC. It is rendered from stored fields in a
     fixed order, never re-described, never summarized. Two compiles of the
     same pack produce byte-identical pack blocks, which is what makes a
     regeneration the same person rather than a cousin.

  2. THE CREATOR NEVER TYPES INTO [PACK] OR [STYLE]. They fill slots in a
     scene template. Identity is not editable because editable identity is
     drift; style is not typeable because a free-text look field is where
     "in the style of Pixar" arrives.

  3. MULTI-PACK SCENES NAME EVERYONE AND USE NO PRONOUNS. "He steps back as
     she crosses" is the single most reliable way to make two people merge.
     The compiler checks for this rather than trusting the template author.

  Pure and synchronous on purpose: no network, no clock, no randomness, so
  the same inputs always give the same prompt and the whole thing is testable
  without a model.
*/

export const MAX_PACKS_IN_FRAME = 3;

/* Pronouns that make a two-hander ambiguous to a model. Checked only when
   more than one pack is in frame; a solo scene can say "he" safely. */
const PRONOUNS = ["he", "she", "they", "him", "her", "them", "his", "hers", "their"];

const cut = (v, n) => String(v ?? "").trim().slice(0, n);

/*
  One person, as the model reads them. Field order is fixed and every field
  is optional except the name, because a thin pack should still compile — it
  just produces a thinner block.
*/
function packBlock(pack, label) {
  const bits = [];
  if (pack.identity) bits.push(cut(pack.identity, 700));
  if (pack.build) bits.push(cut(pack.build, 300));
  if (pack.distinguishing) bits.push(cut(pack.distinguishing, 300));
  if (pack.wardrobe) bits.push(cut(pack.wardrobe, 300));
  const images = (Array.isArray(pack.images) ? pack.images : []).filter((u) => typeof u === "string" && u);
  const refs = images.length ? ` [${images.length} reference image${images.length === 1 ? "" : "s"} attached]` : "";
  return `[${label}] ${cut(pack.name, 80).toUpperCase()} — ${bits.join(" ")}${refs}`;
}

/*
  Are two packs close enough that a model will blend them?

  A deliberately crude heuristic, and it is crude on purpose: it is cheap, it
  never blocks anything, and its only output is an extra line telling the
  model to keep them apart. Being wrong costs one redundant sentence. Not
  checking at all costs a scene where two people become the same person.
*/
function tooSimilar(a, b) {
  const words = (p) => new Set(
    `${p.identity ?? ""} ${p.build ?? ""}`.toLowerCase().match(/[a-z]{4,}/g) ?? [],
  );
  const wa = words(a);
  const wb = words(b);
  if (!wa.size || !wb.size) return false;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  const overlap = shared / Math.min(wa.size, wb.size);
  const neitherDistinguished = !a.distinguishing && !b.distinguishing;
  return overlap > 0.5 && neitherDistinguished;
}

/**
 * @param packs    [{ name, identity, build, distinguishing, wardrobe, images }]
 * @param scene    the scene text, already assembled from a template
 * @param styleId  a preset id from stylePresets
 * @param seconds  shot length, for the scene block
 * @returns { ok, prompt, parts, warnings, errors }
 */
export function compileScene({ packs = [], scene = "", styleId = "", seconds = 8, still = false } = {}) {
  const errors = [];
  const warnings = [];

  const cast = (Array.isArray(packs) ? packs : []).filter((p) => p && cut(p.name, 80));
  if (!cast.length) errors.push("There is nobody in this scene.");
  if (cast.length > MAX_PACKS_IN_FRAME) {
    /* Refused rather than clamped. Four people in one frame fails reliably,
       and a product that lets you do the thing that fails teaches people the
       product does not work. Bigger groups are separate shots, cut together. */
    errors.push(`${cast.length} people in one frame will not hold. Up to ${MAX_PACKS_IN_FRAME} at a time — render the rest as their own shots.`);
  }

  const style = styleById(styleId);
  if (!style) errors.push("Pick a look for this scene.");

  const sceneText = cut(scene, 1200);
  if (!sceneText) errors.push("This scene has no action in it.");

  /* The IP guard, on everything a creator can influence. Refused with the
     term named, never silently rewritten. */
  for (const [what, text] of [["this scene", sceneText], ...cast.map((p) => [`${p.name}'s pack`, `${p.identity ?? ""} ${p.wardrobe ?? ""} ${p.distinguishing ?? ""}`])]) {
    const term = protectedTermIn(text);
    if (term) errors.push(`${what} names "${term}", which cannot be imitated here. Describe what it should look like instead.`);
  }

  if (errors.length) return { ok: false, prompt: "", parts: null, warnings, errors };

  /* ---- [PACK] ---------------------------------------------------------- */
  const labels = ["PACK A", "PACK B", "PACK C"];
  const packLines = cast.map((p, i) => packBlock(p, cast.length === 1 ? "PACK" : labels[i]));

  /* ---- [SCENE] --------------------------------------------------------- */
  const sceneLines = [`[SCENE] ${sceneText}`];
  /* A still has no duration, and telling a still model about seconds is at
     best ignored and at worst read as motion blur. */
  if (!still && !/\b\d+(\.\d+)?\s*second/i.test(sceneText)) {
    sceneLines.push(`Duration ${Number(seconds) || 8} seconds.`);
  }

  if (cast.length > 1) {
    /* Everyone named. A pack the scene never mentions is a person the model
       has been given and not told what to do with, which it resolves by
       inventing something. */
    const missing = cast.filter((p) => !new RegExp(`\\b${cut(p.name, 80).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(sceneText));
    for (const p of missing) warnings.push(`${p.name} is in this scene but the action never mentions them.`);

    const pronoun = PRONOUNS.find((w) => new RegExp(`\\b${w}\\b`, "i").test(sceneText));
    if (pronoun) {
      warnings.push(`"${pronoun}" is ambiguous with more than one person in frame — use their names.`);
      sceneLines.push("Where a pronoun appears, it refers to the nearest named character before it.");
    }

    for (let i = 0; i < cast.length; i++) {
      for (let j = i + 1; j < cast.length; j++) {
        if (tooSimilar(cast[i], cast[j])) {
          sceneLines.push(`${cast[i].name.toUpperCase()} and ${cast[j].name.toUpperCase()} must remain visually distinct and must not take on each other's features.`);
          warnings.push(`${cast[i].name} and ${cast[j].name} are described similarly, which models blend.`);
        }
      }
    }
  }

  /* ---- [STYLE] and [NEGATIVE] ------------------------------------------ */
  const styleLine = `[STYLE] ${style.label}. ${style.words}.`;

  const count = cast.length === 1 ? "Exactly one person in frame." : `Exactly ${cast.length} people in frame.`;
  const negatives = [
    "Do not alter facial structure, proportions or distinguishing features.",
    count,
    "No on-screen text, captions, logos or watermarks.",
    "No additional people, reflections of people, or figures in the background.",
  ];
  if (still) negatives.push("A single still frame. No motion blur, no sequence, no panels.");
  if (style.kind === "medium") {
    /* A drawn medium has a specific failure: the model reverts to photoreal
       partway, or renders a photo of a drawing rather than a drawing. */
    negatives.push("Do not drift toward photorealism. The whole frame is in this medium, including the background.");
  }

  const parts = {
    pack: packLines.join("\n"),
    scene: sceneLines.join(" "),
    style: styleLine,
    negative: `[NEGATIVE] ${negatives.join(" ")}`,
  };

  return {
    ok: true,
    prompt: [parts.pack, parts.scene, parts.style, parts.negative].join("\n"),
    parts,
    warnings,
    errors: [],
  };
}

/**
 * Would these two compiles produce the same person?
 *
 * Used by the identity check in the build: a regeneration must reuse the pack
 * block exactly, and this is how a test says so without comparing whole
 * prompts that differ by design in their scene.
 */
export function samePackBlock(a, b) {
  return !!a?.parts && !!b?.parts && a.parts.pack === b.parts.pack;
}
