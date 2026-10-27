#!/usr/bin/env node
/*
  check-drift — RevaultAI

  The sequence sweep decides what the Production Brain tells somebody about
  their film's continuity. Three ways it could lie, all of them quiet: call a
  sequence consistent when most of it was never looked at, keep reporting a
  change the creator already decided to keep, or tie any difference to any
  commitment and invent a break that is not there.

  Every property below was confirmed to fail against a deliberately broken
  copy of sweepFrom before it was trusted.
*/
import { spineFrom, sweepFrom, mentions } from "../src/lib/sequenceSpine.js";

let pass = 0;
const fails = [];
const ok = (l, c, d) => { if (c) pass++; else fails.push(l + (d ? "  <- " + d : "")); };

const spec = (chars, locks = []) => ({
  subjects: { characters: chars, props: [], locations: [] },
  continuityLocks: locks, action: {}, lighting: {}, composition: {},
});
const JACKET = ["Ruth: soaked jacket"];

/* Three beats, all carrying Ruth and the jacket; the second and third are
   filmed, so they are the ones that can break a commitment. */
const spine = (filmed = ["g1", "g2", "g3"]) => spineFrom({ shots: [
  { id: "sp1", specId: "sp1", name: "Wide", spec: spec(["Ruth"], JACKET), generationId: filmed[0] ?? null },
  { id: "sp2", specId: "sp2", name: "Close", spec: spec(["Ruth"], JACKET), generationId: filmed[1] ?? null },
  { id: "sp3", specId: "sp3", name: "Reverse", spec: spec(["Ruth"], JACKET), generationId: filmed[2] ?? null },
] });

const obs = (generationId, differences, resolution = "pending") =>
  ({ generation_id: generationId, differences, resolution });
const DRY = { aspect: "Ruth's jacket", planned: "soaked", observed: "dry", confidence: "high", consequential: true };

/* ---- matching, and what it refuses to match ---------------------------- */
{
  ok("a difference about the jacket is about the jacket lock", mentions(DRY, "Ruth: soaked jacket"));
  ok("one about something else is not",
     !mentions({ aspect: "the wine glass", planned: "on the table", observed: "gone" }, "Ruth: soaked jacket"));
  ok("short words do not carry a match", !mentions({ aspect: "the of and", planned: "", observed: "" }, "a an the"));
  ok("an empty difference matches nothing", !mentions({}, "Ruth: soaked jacket"));
  ok("an empty commitment is matched by nothing", !mentions(DRY, ""));
}

/* ---- what each beat is -------------------------------------------------- */
{
  const s = sweepFrom({ spine: spine([null, "g2", "g3"]), observations: [obs("g2", [])] });
  ok("a beat nobody filmed is unfilmed", s.beats[0].status === "unfilmed", s.beats[0].status);
  ok("a filmed beat nobody checked is unchecked", s.beats[2].status === "unchecked", s.beats[2].status);
  ok("a filmed beat with no consequential difference held", s.beats[1].status === "held", s.beats[1].status);

  const broken = sweepFrom({ spine: spine(), observations: [obs("g2", [DRY])] });
  ok("a filmed beat that differs is broken", broken.beats[1].status === "broken");
  ok("its differences are carried through", broken.beats[1].differences[0].observed === "dry");

  const harmless = sweepFrom({ spine: spine(), observations: [
    obs("g2", [{ ...DRY, consequential: false }]),
  ] });
  ok("a difference that does not carry forward leaves the beat held",
     harmless.beats[1].status === "held", harmless.beats[1].status);
}

/* ---- commitments -------------------------------------------------------- */
{
  const s = sweepFrom({ spine: spine(), observations: [obs("g2", [DRY])] });
  const jacket = s.commitments.find((c) => /jacket/.test(c.value));
  ok("the jacket is a commitment", !!jacket, JSON.stringify(s.commitments.map((c) => c.value)));
  ok("established in the first beat that had it", jacket.establishedIn === 0);
  ok("inherited by the later beats only", JSON.stringify(jacket.inherited) === "[1,2]", JSON.stringify(jacket.inherited));
  ok("and it looks broken where the difference was", jacket.likelyBroken.includes(1));
  ok("a beat nobody checked is not called broken", !jacket.likelyBroken.includes(2));
  ok("it is listed as unchecked instead", jacket.unchecked.includes(2), JSON.stringify(jacket));

  const other = sweepFrom({ spine: spine(), observations: [
    obs("g2", [{ aspect: "a passing bicycle", planned: "none", observed: "one", confidence: "low", consequential: true }]),
  ] });
  const j2 = other.commitments.find((c) => /jacket/.test(c.value));
  ok("a difference about something else does not break the jacket",
     !j2.likelyBroken.includes(1), JSON.stringify(j2.likelyBroken));
  ok("but the beat is still broken", other.beats[1].status === "broken");
}

/* ---- decisions the creator already made --------------------------------- */
{
  const adopted = sweepFrom({ spine: spine(), observations: [obs("g2", [DRY], "adopted")] });
  ok("an adopted change is settled", adopted.beats[1].settled === true);
  ok("and stops counting against the sequence", adopted.counts.broken === 0, JSON.stringify(adopted.counts));
  ok("and stops breaking its commitment",
     !adopted.commitments.find((c) => /jacket/.test(c.value)).likelyBroken.includes(1));
  ok("while still being counted as settled", adopted.counts.settled === 1);

  const pending = sweepFrom({ spine: spine(), observations: [obs("g2", [DRY])] });
  ok("an undecided one does count", pending.counts.broken === 1);
}

/* ---- what the sweep is allowed to say ----------------------------------- */
{
  const none = sweepFrom({ spine: spine(), observations: [] });
  ok("a sequence nobody checked reports every beat unchecked", none.counts.unchecked === 3);
  ok("and nothing held", none.counts.held === 0);
  ok("and says checking is the next thing", none.next.some((n) => n.id === "check"), JSON.stringify(none.next));

  const broken = sweepFrom({ spine: spine(), observations: [obs("g2", [DRY]), obs("g3", [])] });
  ok("an outstanding difference outranks unchecked beats", broken.next[0].id === "resolve", JSON.stringify(broken.next));

  const unshot = sweepFrom({ spine: spine([null, null, null]), observations: [] });
  ok("a sequence nobody filmed says so", unshot.next.some((n) => n.id === "unshot"), JSON.stringify(unshot.next));

  const empty = sweepFrom({ spine: spineFrom({ shots: [] }), observations: [] });
  ok("an empty project says nothing is planned", empty.next.some((n) => n.id === "empty"));
  ok("and has no commitments", empty.commitments.length === 0);

  const s = sweepFrom({ spine: spine(), observations: [obs("g1", []), obs("g2", [DRY]), obs("g3", [])] });
  ok("the counts add up to the beats",
     s.counts.unfilmed + s.counts.unchecked + s.counts.held + s.counts.broken === s.counts.beats,
     JSON.stringify(s.counts));
  ok("only inherited facts are commitments",
     s.commitments.every((c) => c.inherited.length > 0));
  ok("commitments at risk are counted", s.counts.commitmentsAtRisk >= 1, JSON.stringify(s.counts));
}

if (fails.length) {
  console.error("check-drift FAILED:");
  for (const f of fails) console.error("  - " + f);
  process.exit(1);
}
console.log(`check-drift: ${pass} properties hold — only inherited facts can break, settled decisions stop counting, and an unchecked sequence is never called consistent.`);
