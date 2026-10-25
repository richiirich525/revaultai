import { compileScene } from "./promptCompiler.js";
import { styleById } from "./stylePresets.js";

/*
  stillSet — RevaultAI

  Animate Yourself: one pack, one medium, a set of drawings of that person.

  This is the cheapest thing the product makes and the most useful. A still
  costs a fraction of a video generation and renders in seconds rather than
  ninety, which means the free tier can be generous. More importantly it
  proves the one claim the product rests on, and proves it harder than video
  does: the same person recognizable across a change of MEDIUM is a stronger
  demonstration than the same person across a change of lighting.

  THE POSES ARE THE PRODUCT. A set of eight near-identical front-on portraits
  is one picture generated eight times. These are chosen to vary the three
  things that make a set feel like a set — crop, angle and expression — so
  that somebody scrolling their own results finds several they want to use
  rather than one they settle for.

  Every pose is written as a shot, not as a mood. "Three-quarter turn, eyes
  to camera, head slightly lowered" is something a model can render; "looking
  confident" is something it will interpret, differently each time.
*/

export const POSES = [
  {
    id: "straight-on",
    note: "The one people use",
    words: "Head-and-shoulders portrait, square to camera, eyes to lens, relaxed mouth, even light on both sides of the face.",
  },
  {
    id: "three-quarter",
    note: "Turned, eyes still on you",
    words: "Three-quarter turn of the head, eyes to lens, chin slightly lowered, key light on the near cheek with the far side falling into shadow.",
  },
  {
    id: "looking-away",
    note: "Caught mid-thought",
    words: "Head turned away from the lens and tilted up, eyes off camera-left, caught mid-thought, soft light from the direction they are looking.",
  },
  {
    id: "laughing",
    note: "A real one",
    words: "Mid-laugh with the head tipped back slightly, eyes creased nearly shut, shoulders raised, bright open light.",
  },
  {
    id: "close-crop",
    note: "Just the eyes",
    words: "Very tight crop from brow to mouth, filling the frame, direct eye contact, shallow focus falling off at the ears.",
  },
  {
    id: "arms-crossed",
    note: "Upper body, planted",
    words: "Upper body from the waist, arms crossed, weight on one leg, square to camera, light from high and slightly to one side.",
  },
  {
    id: "over-shoulder",
    note: "Turning back",
    words: "Seen from behind at the shoulder, head turned back over it toward the lens, body angled away, rim light along the jaw and shoulder.",
  },
  {
    id: "low-angle",
    note: "Looking up at you",
    words: "Low camera angle looking up, chin raised, shoulders wide in frame, strong key from above throwing shadow under the brow.",
  },
];

/* A free set is small enough to be cheap and large enough to feel like a set.
   Below four it reads as a sample; past eight the later ones stop being
   chosen. */
export const FREE_SET = 4;
export const FULL_SET = POSES.length;

export function poseById(id) {
  return POSES.find((p) => p.id === id) ?? null;
}

/**
 * Compile a whole set of stills for one pack in one medium.
 *
 * Every still in the set shares a byte-identical pack block — that is what
 * makes it a set of one person rather than eight drawings of eight people —
 * and differs only in its pose line.
 *
 * @param pack     the character pack
 * @param mediumId a preset id; must be a medium, not a genre
 * @param count    how many poses, from the top of the list
 * @returns { ok, stills: [{ poseId, note, prompt, parts }], errors, warnings }
 */
export function buildStillSet({ pack = null, mediumId = "", count = FREE_SET } = {}) {
  const errors = [];
  const warnings = [];

  if (!pack || !String(pack.name ?? "").trim()) errors.push("There is no pack to draw.");

  const style = styleById(mediumId);
  if (!style) {
    errors.push("Pick a medium to draw this in.");
  } else if (style.kind !== "medium") {
    /* A genre is a way of photographing a scene, not a way of drawing a
       person. Letting Neo-Noir through here would produce a photoreal
       portrait set and quietly turn Animate Yourself into something else. */
    errors.push(`${style.label} is a film look, not a drawing medium. Animate Yourself needs a medium.`);
  }

  const want = Math.max(1, Math.min(Number(count) || FREE_SET, POSES.length));
  if (errors.length) return { ok: false, stills: [], errors, warnings };

  const stills = [];
  for (const pose of POSES.slice(0, want)) {
    const compiled = compileScene({
      packs: [pack],
      scene: `${String(pack.name).trim().toUpperCase()}, drawn. ${pose.words}`,
      styleId: mediumId,
      still: true,
    });
    /* A pack that fails to compile fails for every pose identically — a
       protected name, an empty identity — so the first failure is the whole
       answer and repeating it eight times helps nobody. */
    if (!compiled.ok) return { ok: false, stills: [], errors: compiled.errors, warnings };
    warnings.push(...compiled.warnings);
    stills.push({ poseId: pose.id, note: pose.note, prompt: compiled.prompt, parts: compiled.parts });
  }

  return { ok: true, stills, errors: [], warnings };
}

/** Do every still in a set describe the same person? */
export function setIsOnePerson(stills) {
  if (!Array.isArray(stills) || stills.length < 2) return true;
  const first = stills[0]?.parts?.pack;
  return !!first && stills.every((s) => s?.parts?.pack === first);
}
