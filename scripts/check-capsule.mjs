/*
  check-capsule — what a world capsule must get right when it is extracted.

  A capsule is built from a take with no authoring step, which means every
  field here is a guess made from data the creator filled in for some other
  purpose. These cases hold the guesses to the rules that matter:

    - The footage beats the plan. If the Script Supervisor saw the door open,
      the world has an open door in it, whatever the spec said would happen.
    - Images stay in the stored R2 carrier form. A presigned URL written into
      a capsule expires in two hours and leaves a permanent world full of
      dead pictures.
    - A voice is a reference to a Vault entry, never audio. The Recording
      Studio resolves voices server-side so a forged request cannot make a
      character speak in someone else's voice, and a capsule must not be the
      hole in that.
    - Thin input still yields a capsule. The floor for walking into a world is
      somebody to meet, somewhere to be, and some condition the place is in.
    - Everything is bounded, because the capsule lands in a jsonb column with
      a size ceiling on it.

  Lives in the build chain because capsule extraction is the one part of a
  world that nobody reviews before a viewer sees it.
*/
import { capsuleFrom, capsuleGaps, CAPSULE_VERSION } from "../src/lib/worldCapsule.js";

let bad = 0;
const ok = (name, cond, extra = "") => {
  if (!cond) { bad++; console.error("  FAIL " + name + (extra ? "  " + JSON.stringify(extra) : "")); }
};

const R2 = "https://pub-abc.r2.dev";

/* A take with everything filled in, which is the best case. */
const full = {
  generation: {
    id: "gen-1", model: "veo-3.1", prompt: "Nell waits for him in the kitchen",
    film_spec_id: "spec-1", film_spec_version: 3, project_id: "proj-1",
    end_frame_url: `${R2}/frames/gen-1-end.jpg`, end_frame_at: 9.4,
    completed_at: "2026-10-24T10:00:00Z",
  },
  spec: {
    identity: { title: "The kitchen, after", purpose: "She has decided and he has not caught up" },
    subjects: { locations: ["A narrow galley kitchen"] },
    action: { endState: "She stands at the sink with her back to him. The door is closed." },
    style: { look: "handheld naturalism", palette: "sodium and cold window", texture: "16mm grain" },
    continuityLocks: ["Nell: gray cardigan, sleeves pushed up", "Kitchen: one bulb out over the sink"],
  },
  vault: [
    { id: "v1", kind: "character", name: "Nell", description: "Woman, late 30s, sharp features.",
      wardrobe: "Gray cardigan", distinguishing: "Scar through left eyebrow",
      images: [`${R2}/vault/nell-1.png`, `${R2}/vault/nell-2.png`], voice_preset: "alice" },
    // The same entry referenced twice. A world with two of somebody in it is
    // a bug a viewer notices immediately.
    { id: "v1", kind: "character", name: "Nell", description: "duplicate reference" },
    { id: "v2", kind: "character", name: "Theo", description: "Man, 40s, heavy build." },
    { id: "v3", kind: "location", name: "The galley kitchen", description: "Narrow, one window.",
      images: [`${R2}/vault/kitchen.png`] },
    { id: "v4", kind: "prop", name: "Wine glass", description: "Half full, lipstick on the rim." },
    { id: "v5", kind: "look", name: "House look", description: "fallback look text" },
  ],
  observed: {
    observed_end: "She is at the sink, back to him. The door stands open behind him.",
    differences: [
      { aspect: "kitchen door", planned: "closed", observed: "open", confidence: "high", consequential: true },
      { aspect: "her expression", planned: "flat", observed: "a half smile", confidence: "high", consequential: false },
      { aspect: "the light", planned: "warm", observed: "maybe cooler", confidence: "low", consequential: true },
    ],
  },
  rehearsal: { id: "reh-1", title: "Kitchen argument", data: { setId: "kitchen", light: { preset: "window", bearing: 20 } } },
};

const c = capsuleFrom(full);
const g = capsuleGaps(c);

ok("a complete take is usable", g.usable === true, g.missing);
ok("cast de-duplicated by vault id", c.cast.length === 2, c.cast.map((p) => p.name));
ok("cast order preserved", c.cast[0].name === "Nell" && c.cast[1].name === "Theo");
ok("wardrobe and distinguishing carried", !!c.cast[0].wardrobe && !!c.cast[0].distinguishing);
ok("a voice is a reference, not audio", c.cast[0].voice?.fromVault === true && !("sampleUrl" in c.cast[0].voice), c.cast[0].voice);
ok("no voice means null, not an empty voice", c.cast[1].voice === null);
ok("set prefers the vault location over spec prose", c.set.name === "The galley kitchen", c.set.name);
ok("stage set carried from the rehearsal", c.set.stageSetId === "kitchen", c.set.stageSetId);
ok("light carried", c.set.light?.preset === "window");
ok("props carried", c.props.length === 1 && c.props[0].name === "Wine glass");
ok("look prefers the spec over the vault fallback", c.look.look === "handheld naturalism", c.look.look);
ok("title from the spec identity", c.title === "The kitchen, after", c.title);
ok("version stamped", c._v === CAPSULE_VERSION);

/* The footage beats the plan. */
ok("state is what was observed", /door stands open/.test(c.state.text), c.state.text);
ok("state says where it came from", c.state.source === "observed");
ok("a consequential difference carries", c.state.carried.some((d) => d.aspect === "kitchen door" && d.is === "open"), c.state.carried);
ok("an inconsequential difference does not", !c.state.carried.some((d) => d.aspect === "her expression"), c.state.carried);
ok("a low-confidence difference does not", !c.state.carried.some((d) => d.aspect === "the light"), c.state.carried);
ok("continuity locks carried", c.state.locks.length === 2);

/* Images. */
const allImages = [...c.cast.flatMap((p) => p.images), ...c.set.images, c.entry.imageUrl];
ok("every image is the stored carrier form", allImages.every((u) => u.startsWith(R2)), allImages);
ok("nothing is presigned", !allImages.some((u) => /X-Amz-|Signature=|Expires=/.test(u)));
ok("the way in is the frame the take ended on", c.entry.imageUrl.endsWith("gen-1-end.jpg"));
ok("and the time it ended at", c.entry.atSeconds === 9.4);

const junk = capsuleFrom({
  vault: [{ id: "v9", kind: "character", name: "X", description: "d",
    images: ["javascript:alert(1)", "/relative.png", null, { url: `${R2}/a.png` }, `${R2}/a.png`, `${R2}/b.png`] }],
});
ok("only http(s) images survive", junk.cast[0].images.every((u) => /^https?:\/\//.test(u)), junk.cast[0].images);
ok("object form unwrapped and de-duplicated", junk.cast[0].images.length === 2, junk.cast[0].images);

/* Memory and provenance. */
ok("the origin beat says why the world exists", c.origin.text === "She has decided and he has not caught up", c.origin.text);
ok("the origin beat is dated from the take", c.origin.at === "2026-10-24T10:00:00Z");
ok("memory is not kept in the capsule", !("beats" in c), Object.keys(c));
ok("provenance traces back to the take", c.provenance.generationId === "gen-1" && c.provenance.specVersion === 3);
ok("locked at a real time", !Number.isNaN(Date.parse(c.provenance.lockedAt)));

/* A take with nothing. */
const bare = capsuleFrom({ generation: { id: "g", prompt: "two people argue" } });
const bg = capsuleGaps(bare);
ok("an empty take is not usable", bg.usable === false);
ok("and says nobody is in it", bg.missing.some((m) => /nobody in it/.test(m)), bg.missing);
ok("and says there is no state", bg.missing.some((m) => /no world state/.test(m)));
ok("and says there is nowhere to be", bg.missing.some((m) => /nowhere to be/.test(m)));
ok("but still returns a capsule", bare._v === CAPSULE_VERSION && Array.isArray(bare.cast) && !!bare.origin);
ok("the origin falls back to the prompt", bare.origin.text === "two people argue", bare.origin.text);
ok("titled from the prompt when there is no spec", bare.title === "two people argue", bare.title);
ok("called with nothing at all, still a capsule", capsuleFrom()._v === CAPSULE_VERSION);

/* The floor: one person, one place, one condition. */
const thin = capsuleFrom({
  generation: { id: "g2", prompt: "p" },
  spec: { action: { endState: "He is alone in the room with the lamp on." } },
  vault: [{ id: "v1", kind: "character", name: "Theo", description: "Man, 40s." }],
  rehearsal: { id: "r", data: { setId: "office" } },
});
const tg = capsuleGaps(thin);
ok("the floor alone is walkable", tg.usable === true, tg.missing);
ok("state falls back to the plan", thin.state.source === "planned");
ok("flags the missing establishing frame", tg.thin.some((t) => /establishing frame/.test(t)));
ok("flags that nobody has a voice", tg.thin.some((t) => /voice/.test(t)));
ok("flags that the state is the plan", tg.thin.some((t) => /not the footage/.test(t)));
ok("does not flag a set it has", !tg.thin.some((t) => /3D stage/.test(t)));
ok("reports cast size, which the first gate counts", tg.castSize === 1);

/* Bounded, because this lands in jsonb with a ceiling on it. */
const huge = capsuleFrom({
  generation: { id: "g3", prompt: "x".repeat(5000), end_frame_url: `${R2}/${"y".repeat(2000)}` },
  spec: { action: { endState: "z".repeat(5000) }, continuityLocks: Array(50).fill("lock " + "w".repeat(500)) },
  // Distinct URLs, so this tests the cap rather than de-duplication.
  vault: Array(30).fill(0).map((_, i) => ({ id: "v" + i, kind: "character", name: "N" + i,
    description: "d".repeat(3000), images: Array(20).fill(0).map((__, j) => `${R2}/char-${i}-${j}.png`) })),
});
ok("cast capped", huge.cast.length === 8, huge.cast.length);
ok("locks capped", huge.state.locks.length === 12);
ok("descriptions truncated", huge.cast[0].description.length === 700);
ok("images capped per character", huge.cast[0].images.length === 4);
ok("title truncated", huge.title.length === 140);
ok("the whole capsule stays well under the column ceiling",
  JSON.stringify(huge).length < 60000, JSON.stringify(huge).length);

/*
  A take that referenced no Vault entry at all.

  This is the common case, not the edge one: measured across a real corpus of
  71 finished takes, every single one had no Vault reference, and extraction
  that read only the Vault found nobody in any of them. The cast was in the
  Shot Spec the whole time — names in subjects.characters, descriptions in
  continuityLocks as "Name: description".
*/
const specOnly = capsuleFrom({
  generation: { id: "g", prompt: "two of them in the kitchen" },
  spec: {
    subjects: { characters: ["Nell", "Theo"], locations: ["The galley kitchen"], props: ["Wine glass"] },
    action: { endState: "She is at the sink." },
    continuityLocks: [
      "Nell: Woman, late 30s, gray cardigan",
      "The galley kitchen: Narrow, one window",
      "Wine glass: Half full",
    ],
  },
});
const sg = capsuleGaps(specOnly);
ok("a spec-only take is usable", sg.usable === true, sg.missing);
ok("the cast comes from the spec", specOnly.cast.map((c) => c.name).join(",") === "Nell,Theo", specOnly.cast.map((c) => c.name));
ok("a continuity lock becomes the description", specOnly.cast[0].description === "Woman, late 30s, gray cardigan", specOnly.cast[0].description);
ok("a character with no lock is still present, just undescribed",
  specOnly.cast[1].name === "Theo" && specOnly.cast[1].description === "", specOnly.cast[1]);
ok("spec characters carry no vault id", specOnly.cast.every((c) => c.vaultId === null));
ok("and no voice, because a voice is a Vault thing", specOnly.cast.every((c) => c.voice === null));
ok("the set comes from the spec", specOnly.set.name === "The galley kitchen", specOnly.set.name);
ok("and its lock describes it", specOnly.set.description === "Narrow, one window", specOnly.set.description);
ok("props come from the spec too", specOnly.props[0]?.name === "Wine glass" && specOnly.props[0]?.description === "Half full", specOnly.props);

/* Vault entries are richer, so they win where both describe the same person. */
const both = capsuleFrom({
  generation: { id: "g", prompt: "p" },
  spec: {
    subjects: { characters: ["Nell", "Theo"], locations: ["Somewhere else"] },
    action: { endState: "dark" },
    continuityLocks: ["Nell: the spec's thinner description"],
  },
  vault: [{ id: "v1", kind: "character", name: "Nell", description: "The Vault's full description.",
    wardrobe: "Gray cardigan", images: [`${R2}/n.png`], voice_preset: "alice" }],
});
ok("the Vault entry wins for a character in both", both.cast[0].description === "The Vault's full description.", both.cast[0].description);
ok("and keeps its wardrobe, images and voice",
  !!both.cast[0].wardrobe && both.cast[0].images.length === 1 && !!both.cast[0].voice);
ok("nobody is duplicated across the two sources",
  both.cast.filter((c) => c.name === "Nell").length === 1, both.cast.map((c) => c.name));
ok("and the spec still adds the one the Vault lacks",
  both.cast.some((c) => c.name === "Theo"), both.cast.map((c) => c.name));

/* Named but undescribed is its own diagnosis, not "nobody in it". */
const namedOnly = capsuleGaps(capsuleFrom({
  generation: { id: "g", prompt: "p" },
  spec: { subjects: { characters: ["Nell"], locations: ["A room"] }, action: { endState: "dark" }, continuityLocks: [] },
}));
ok("a named but undescribed cast is not usable", namedOnly.usable === false);
ok("and says so specifically", namedOnly.missing.some((m) => /named but not described/.test(m)), namedOnly.missing);
ok("rather than claiming nobody is in it", !namedOnly.missing.some((m) => /nobody in it/.test(m)), namedOnly.missing);

/* A malformed lock must not become a character's description. */
const weird = capsuleFrom({
  generation: { id: "g", prompt: "p" },
  spec: { subjects: { characters: ["Nell"] }, action: { endState: "dark" },
    continuityLocks: ["no colon here", ": starts with one", "Nell: the right one"] },
});
ok("only a well-formed lock is used", weird.cast[0].description === "the right one", weird.cast[0].description);

if (bad) { console.error(`\ncheck-capsule FAILED: ${bad} problem${bad === 1 ? "" : "s"}.`); process.exit(1); }
console.log("check-capsule: extraction holds — footage over plan, images unsigned, voices by reference, thin takes still walkable.");
