#!/usr/bin/env node
/*
  check-spine — RevaultAI

  The sequence spine decides which shots a change reaches and which facts a
  drift check is allowed to complain about. Both are quiet failures: a blast
  radius that is too small silently leaves stale shots in a film, and a
  carrier list that is too generous invents continuity nobody wrote.

  So these are properties, each one phrased as the thing that would go wrong.
  Every assertion here was confirmed to fail against a deliberately broken
  copy of the module before it was trusted.
*/
import {
  spineFrom, spineGaps, spineIsUsable, factsFor, parseLock, lightingFact, MIN_SHOTS,
} from "../src/lib/sequenceSpine.js";

let pass = 0;
const fails = [];
const ok = (label, cond, detail) => {
  if (cond) pass++;
  else fails.push(label + (detail ? "  <- " + detail : ""));
};

const spec = (patch = {}) => ({
  subjects: { characters: [], props: [], locations: [], ...(patch.subjects ?? {}) },
  composition: { screenDirection: "", ...(patch.composition ?? {}) },
  lighting: { ...(patch.lighting ?? {}) },
  timing: { durationSeconds: patch.seconds ?? null },
  continuityLocks: patch.continuityLocks ?? [],
});

const RUTH = spec({
  subjects: { characters: ["Ruth"], locations: ["the cafe"], props: ["an envelope"] },
  continuityLocks: ["Ruth: soaked jacket"],
  lighting: { keyDirection: "window left", quality: "soft" },
  composition: { screenDirection: "left to right" },
});

/* ---- reading one spec ------------------------------------------------- */
{
  const f = factsFor(RUTH);
  ok("a character is read out of a spec", f.cast.includes("Ruth"));
  ok("so is a location", f.location.includes("the cafe"));
  ok("so is a prop", f.prop.includes("an envelope"));
  ok("a lock is kept whole", f.lock[0] === "Ruth: soaked jacket");
  ok("lighting joins its fields", f.lighting[0] === "window left, soft", JSON.stringify(f.lighting));
  ok("an empty spec yields no facts", Object.values(factsFor(spec())).every((v) => v.length === 0));

  const p = parseLock("Ruth: soaked jacket");
  ok("a lock naming somebody splits", p.subject === "Ruth" && p.state === "soaked jacket");
  const q = parseLock("the clock stays at 4:15");
  ok("a lock with no subject keeps the whole line", q.subject === null && /4:15/.test(q.state), JSON.stringify(q));
  ok("an empty lock is nothing", parseLock("   ") === null);
  ok("lighting with nothing set is empty", lightingFact(spec()) === "");
}

/* ---- what carries ------------------------------------------------------ */
{
  const two = spineFrom({ shots: [
    { id: "a", name: "Wide", spec: RUTH, generationId: "g1" },
    { id: "b", name: "Close", spec: spec({ subjects: { characters: ["Ruth"] } }), generationId: "g2" },
  ] });
  const cast = two.carries.find((c) => c.dimension === "cast");
  ok("somebody in two shots carries", !!cast && cast.beats.length === 2, JSON.stringify(two.carries));
  ok("a prop in one shot does not carry", !two.carries.some((c) => c.dimension === "prop"));
  ok("a lock in one shot does not carry", !two.carries.some((c) => c.dimension === "lock"));

  const cased = spineFrom({ shots: [
    { spec: spec({ subjects: { characters: ["Ruth"] } }), generationId: "g1" },
    { spec: spec({ subjects: { characters: ["  ruth "] } }), generationId: "g2" },
  ] });
  ok("the same name spelled loosely is the same person",
     cased.carries.some((c) => c.dimension === "cast" && c.beats.length === 2),
     JSON.stringify(cased.carries));

  const apart = spineFrom({ shots: [
    { spec: spec({ subjects: { characters: ["Ruth"] } }), generationId: "g1" },
    { spec: spec({ subjects: { characters: ["Jonah"] } }), generationId: "g2" },
  ] });
  ok("two strangers share nothing", apart.carries.length === 0);
  ok("and that is reported as nothing carrying",
     spineGaps(apart).some((g) => g.id === "nothing_carries"));
}

/* ---- blast radius ------------------------------------------------------ */
{
  const s = spineFrom({ shots: [
    { spec: spec({ subjects: { characters: ["Ruth"] } }), generationId: "g1" },
    { spec: spec({ subjects: { characters: ["Jonah"] } }), generationId: "g2" },
    { spec: spec({ subjects: { characters: ["Ruth"] } }), generationId: "g3" },
  ] });
  ok("a change reaches a later shot sharing a carrier", s.downstream[0].includes(2), JSON.stringify(s.downstream));
  ok("it does not reach one that shares nothing", !s.downstream[0].includes(1));
  ok("nothing reaches backwards", s.downstream[2].length === 0);
  ok("the middle shot reaches nothing forward", s.downstream[1].length === 0);
}

/* ---- the verdicts ------------------------------------------------------ */
{
  const one = spineFrom({ shots: [{ spec: RUTH, generationId: "g1" }] });
  ok(`a ${MIN_SHOTS - 1}-shot sequence is not a sequence`,
     spineGaps(one)[0]?.id === "single_shot" && !spineIsUsable(one));
  ok("and nothing else is blamed first", spineGaps(one).length === 1);

  const unplanned = spineFrom({ shots: [
    { spec: null, generationId: "g1" }, { spec: null, generationId: "g2" },
  ] });
  ok("shots with no spec report no spec", spineGaps(unplanned)[0]?.id === "no_spec");
  ok("and stop there rather than listing every missing dimension",
     spineGaps(unplanned).length === 1, JSON.stringify(spineGaps(unplanned)));

  const unshot = spineFrom({ shots: [
    { spec: RUTH, generationId: null },
    { spec: spec({ subjects: { characters: ["Ruth"] } }), generationId: null },
  ] });
  ok("a planned but unshot sequence has nothing to check against",
     spineGaps(unshot).some((g) => g.id === "nothing_rendered") && !spineIsUsable(unshot));

  const good = spineFrom({ shots: [
    { spec: RUTH, generationId: "g1" },
    { spec: spec({
        subjects: { characters: ["Ruth"], locations: ["the cafe"] },
        continuityLocks: ["Ruth: soaked jacket"],
        lighting: { keyDirection: "window left", quality: "soft" },
      }), generationId: "g2" },
  ] });
  ok("a real sequence is usable", spineIsUsable(good), JSON.stringify(spineGaps(good)));
  ok("its locks carry", good.carries.some((c) => c.dimension === "lock"));
  ok("its lighting carries", good.carries.some((c) => c.dimension === "lighting"));
  ok("and it reports no blocking gaps",
     !spineGaps(good).some((g) => ["single_shot", "no_spec", "nothing_carries", "nothing_rendered"].includes(g.id)));

  ok("counts say what was read",
     good.counts.shots === 2 && good.counts.withSpec === 2 && good.counts.rendered === 2);
}

if (fails.length) {
  console.error("check-spine FAILED:");
  for (const f of fails) console.error("  - " + f);
  process.exit(1);
}
console.log(`check-spine: ${pass} properties hold — carriers need two shots, blast radius runs forward only, and a thin sequence says which way it is thin.`);
