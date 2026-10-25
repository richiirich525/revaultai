/*
  check-presets — the rules that keep identity locked and the lawyers away.

  Two things are enforced here, and both are rules that read as obvious in a
  document and get broken quietly in code six months later.

  1. NO PRESET IMITATES ANYONE. A medium is a technique and nobody owns it;
     a studio's house style belongs to a company with a legal team. This is
     the first thing anybody will ask for — "make me a Ghibli character" —
     so the refusal lives in the build rather than in somebody's memory.

  2. THE PACK BLOCK IS DETERMINISTIC. The whole product rests on the same
     person coming back, and that is true only if the block describing them
     is rendered identically every time. A compiler that ever summarized,
     reordered or re-described a pack would break the one claim competitors
     cannot match, and it would break it invisibly — the output would still
     look fine, just like somebody else.

  Runs in the build chain because both failures are silent.
*/
import { compileScene, samePackBlock, MAX_PACKS_IN_FRAME } from "../src/lib/promptCompiler.js";
import { STYLE_PRESETS, MEDIUMS, GENRES, styleById, protectedTermIn, PROTECTED_TERMS } from "../src/lib/stylePresets.js";

let bad = 0;
const ok = (name, cond, extra = "") => {
  if (!cond) { bad++; console.error("  FAIL " + name + (extra ? "  " + JSON.stringify(extra) : "")); }
};

/* ---- the catalog itself ------------------------------------------------ */
ok("there are mediums to animate into", MEDIUMS.length >= 4, MEDIUMS.length);
ok("there are genres to be cast in", GENRES.length >= 8, GENRES.length);

const ids = new Set();
for (const s of STYLE_PRESETS) {
  ok(`${s.id} has a unique id`, !ids.has(s.id), s.id);
  ids.add(s.id);
  ok(`${s.id} is a medium or a genre`, s.kind === "medium" || s.kind === "genre", s.kind);
  ok(`${s.id} has a label`, !!s.label);
  ok(`${s.id} has a note`, !!s.note);
  /* Craft language, not adjectives. A short `words` is a preset that will
     not hold a look. */
  ok(`${s.id} describes a look in real terms`, (s.words ?? "").length > 80, (s.words ?? "").length);
  ok(`${s.id} resolves by id`, styleById(s.id) === s);
}

/* Nobody is imitated — not in a name, a note, or the words sent to the model. */
for (const s of STYLE_PRESETS) {
  for (const [field, text] of [["label", s.label], ["id", s.id], ["note", s.note], ["words", s.words]]) {
    const term = protectedTermIn(text);
    ok(`${s.id} ${field} imitates nobody`, !term, { field, term });
  }
}

/* And the guard itself works, which is the part that would otherwise rot. */
ok("the guard catches a studio", protectedTermIn("in the style of Studio Ghibli") === "ghibli");
ok("the guard catches a franchise", protectedTermIn("make me a TOP GUN pilot") === "top gun");
ok("the guard is case-insensitive", protectedTermIn("PIXAR") === "pixar");
ok("the guard survives punctuation", protectedTermIn("spider-verse style, please") === "spider-verse");
ok("the guard matches whole words only", protectedTermIn("the dcs are configured") === null);
ok("the guard does not fire on ordinary words", protectedTermIn("a woman in a red coat crosses a park") === null);
ok("every protected term is lowercase", PROTECTED_TERMS.every((t) => t === t.toLowerCase()));

/* ---- the compiler ------------------------------------------------------ */
const nell = {
  name: "Nell", identity: "Woman, late 30s, sharp features, dark eyes.",
  build: "Slight, around five foot four.", distinguishing: "Scar through the left eyebrow.",
  wardrobe: "Gray cardigan.", images: ["r2://packs/nell/ref-front.jpg"],
};
const theo = {
  name: "Theo", identity: "Man, 40s, heavy set, deep-set eyes.",
  build: "Broad, over six foot.", distinguishing: "Shaved head.",
  wardrobe: "Work jacket.", images: ["r2://packs/theo/ref-front.jpg"],
};

const solo = compileScene({ packs: [nell], scene: "NELL stops under the awning and looks off camera left. Slow push in.", styleId: "neo-noir" });
ok("a solo scene compiles", solo.ok, solo.errors);
ok("the four blocks are present and in order",
  /^\[PACK\][\s\S]*\[SCENE\][\s\S]*\[STYLE\][\s\S]*\[NEGATIVE\][\s\S]+$/.test(solo.prompt.trim()), solo.prompt.slice(0, 60));
ok("the identity is verbatim", solo.parts.pack.includes("Woman, late 30s, sharp features, dark eyes."));
ok("the distinguishing feature survives", solo.parts.pack.includes("Scar through the left eyebrow."));
ok("the reference image is announced", /1 reference image attached/.test(solo.parts.pack));
ok("the name is upper case in the block", solo.parts.pack.includes("NELL"));
ok("the style came from the preset", solo.parts.style.includes("sodium streetlight"));
ok("a duration is added when the scene omits one", /Duration 8 seconds/.test(solo.parts.scene));
ok("one person is specified", solo.parts.negative.includes("Exactly one person in frame."));
ok("the face is protected", /Do not alter facial structure/.test(solo.parts.negative));
ok("a solo scene may use a pronoun", solo.warnings.length === 0, solo.warnings);

/* Field order is part of the contract, not an accident. Identity leads
   because the earliest tokens carry the most weight, and a reversal would
   stay deterministic while quietly making every prompt worse — the kind of
   change that is invisible in a diff and visible in the output. */
const order = ["Woman, late 30s", "Slight, around five foot four", "Scar through the left eyebrow", "Gray cardigan"]
  .map((t) => solo.parts.pack.indexOf(t));
ok("every field is present in the block", order.every((i) => i >= 0), order);
ok("identity, build, distinguishing, wardrobe, in that order",
  order.every((v, i) => i === 0 || v > order[i - 1]), order);

/* The property the whole product rests on. */
const again = compileScene({ packs: [nell], scene: "NELL walks away down the alley. Static wide.", styleId: "wuxia-rooftop", seconds: 6 });
ok("a different scene and style still compiles", again.ok, again.errors);
ok("the pack block is byte-identical across regenerations", samePackBlock(solo, again),
  { first: solo.parts.pack, second: again.parts.pack });
ok("but the scene did change", solo.parts.scene !== again.parts.scene);
ok("and so did the style", solo.parts.style !== again.parts.style);

/* Compiling the same thing twice must give the same string, or nothing
   downstream can be cached, compared or trusted. */
const twice = compileScene({ packs: [nell], scene: "NELL stops under the awning and looks off camera left. Slow push in.", styleId: "neo-noir" });
ok("the compiler is deterministic", twice.prompt === solo.prompt);

/* ---- more than one person ---------------------------------------------- */
const duo = compileScene({
  packs: [nell, theo],
  scene: "NELL stops under the awning. THEO crosses in front of her from camera left.",
  styleId: "neo-noir",
});
ok("a two-hander compiles", duo.ok, duo.errors);
ok("both packs are labeled apart", duo.parts.pack.includes("[PACK A]") && duo.parts.pack.includes("[PACK B]"));
ok("the person count is stated", duo.parts.negative.includes("Exactly 2 people in frame."));
ok("background people are excluded", /No additional people/.test(duo.parts.negative));

const pronouns = compileScene({
  packs: [nell, theo],
  scene: "NELL waits. He steps back as she crosses.",
  styleId: "neo-noir",
});
ok("a pronoun in a two-hander is flagged", pronouns.warnings.some((w) => /ambiguous/.test(w)), pronouns.warnings);
ok("and the model is told how to read it", /nearest named character/.test(pronouns.parts.scene));
ok("but it still compiles", pronouns.ok);

const unmentioned = compileScene({
  packs: [nell, theo],
  scene: "NELL stands at the window for a long moment.",
  styleId: "neo-noir",
});
ok("a pack the scene never mentions is flagged",
  unmentioned.warnings.some((w) => /Theo is in this scene/.test(w)), unmentioned.warnings);

/* Two people described alike are the blend case. */
const twinA = { name: "Ann", identity: "Woman, early thirties, dark hair, pale complexion, angular face." };
const twinB = { name: "Beth", identity: "Woman, early thirties, dark hair, pale complexion, angular face." };
const twins = compileScene({ packs: [twinA, twinB], scene: "ANN turns to BETH.", styleId: "neo-noir" });
ok("similar packs are told to stay apart", /must remain visually distinct/.test(twins.parts.scene), twins.parts.scene);
ok("and the creator is warned", twins.warnings.some((w) => /described similarly/.test(w)), twins.warnings);
ok("distinct packs are not", !/must remain visually distinct/.test(duo.parts.scene));

/* ---- refusals ----------------------------------------------------------- */
const crowd = compileScene({ packs: [nell, theo, twinA, twinB], scene: "They all stand there.", styleId: "neo-noir" });
ok("four in one frame is refused", !crowd.ok);
ok("and the refusal says what to do instead", crowd.errors.some((e) => /their own shots/.test(e)), crowd.errors);
ok("three is allowed", compileScene({ packs: [nell, theo, twinA], scene: "NELL, THEO and ANN wait.", styleId: "neo-noir" }).ok);
ok("the cap is what the module says it is", MAX_PACKS_IN_FRAME === 3);

ok("no cast is refused", !compileScene({ packs: [], scene: "A room.", styleId: "neo-noir" }).ok);
ok("no scene is refused", !compileScene({ packs: [nell], scene: "   ", styleId: "neo-noir" }).ok);
ok("no style is refused", !compileScene({ packs: [nell], scene: "NELL waits.", styleId: "" }).ok);
ok("an unknown style is refused", !compileScene({ packs: [nell], scene: "NELL waits.", styleId: "made-up" }).ok);
ok("called with nothing is refused, not a crash", !compileScene().ok);

const infringing = compileScene({ packs: [nell], scene: "NELL flies a jet like in Top Gun.", styleId: "neo-noir" });
ok("a protected title in the scene is refused", !infringing.ok);
ok("and the term is named", infringing.errors.some((e) => /"top gun"/.test(e)), infringing.errors);
ok("and it is not silently rewritten", infringing.prompt === "");

const infringingPack = compileScene({
  packs: [{ name: "X", identity: "Looks like a Pixar character.", images: [] }],
  scene: "X waves.", styleId: "cel-shade",
});
ok("a protected name in a pack is refused too", !infringingPack.ok, infringingPack.errors);
ok("and says which pack", infringingPack.errors.some((e) => /X's pack/.test(e)), infringingPack.errors);

/* ---- drawn mediums ------------------------------------------------------ */
const drawn = compileScene({ packs: [nell], scene: "NELL runs across the rooftop.", styleId: "cel-shade" });
ok("a medium compiles", drawn.ok, drawn.errors);
ok("and guards against reverting to photoreal", /Do not drift toward photorealism/.test(drawn.parts.negative));
ok("a genre does not carry that guard", !/photorealism/.test(solo.parts.negative));
ok("the same person survives a change of medium", samePackBlock(solo, drawn),
  { photoreal: solo.parts.pack, drawn: drawn.parts.pack });

/* ---- thin packs still work ---------------------------------------------- */
const thin = compileScene({ packs: [{ name: "Jo" }], scene: "JO sits down.", styleId: "sunday-funnies" });
ok("a pack with only a name compiles", thin.ok, thin.errors);
ok("and says so without inventing anything", thin.parts.pack === "[PACK] JO — ", thin.parts.pack);

if (bad) { console.error(`\ncheck-presets FAILED: ${bad} problem${bad === 1 ? "" : "s"}.`); process.exit(1); }
console.log(`check-presets: ${MEDIUMS.length} mediums, ${GENRES.length} genres, nobody imitated, pack blocks deterministic.`);
