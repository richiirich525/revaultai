/*
  check-share — the rules that decide what a shared scene may contain.

  A share is a stranger's JSON handed to the studio and then to three.js, so
  the sanitizer is the only thing between a link and the page. It is a
  whitelist: it builds a new rehearsal from the fields it recognizes and drops
  everything else. These cases hold it to that.

  Lives in the build chain because the cost of this quietly loosening is a
  link that can break or mine somebody else's browser.
*/
import { sanitize, tooBig } from "../src/lib/shareSanitize.js";
import { STARTERS } from "../src/lib/starters.js";

let bad = 0;
const ok = (name, cond, extra = "") => {
  if (!cond) { bad++; console.error("  FAIL " + name + (extra ? "  " + extra : "")); }
};

// A real scene must come back whole — a sanitizer that eats the content is
// as broken as one that lets rubbish through.
for (const st of STARTERS) {
  const before = st.make();
  const after = sanitize(before);
  ok(`${st.id} survives`, !!after);
  if (!after) continue;
  ok(`${st.id} keeps its performers`, after.actors.length === before.actors.length);
  ok(`${st.id} keeps every mark`, after.actors.every((a, i) => a.keys.length === before.actors[i].keys.length));
  ok(`${st.id} keeps its directions`,
    after.actors.every((a, i) => a.keys.every((k, j) => k.action === (before.actors[i].keys[j].action ?? null))));
  ok(`${st.id} keeps its set`, after.setId === before.setId || !!after.setCustom);
  ok(`${st.id} is not oversized`, !tooBig(after));
}

// Nothing shaped wrongly may become a rehearsal.
for (const [name, input] of [
  ["null", null], ["undefined", undefined], ["a string", "hello"], ["a number", 7],
  ["an array", [1, 2]], ["an empty object", {}],
  ["no actors", { cameras: [{ keys: [{ t: 0, x: 1, y: 1 }] }] }],
  ["no cameras", { actors: [{ keys: [{ t: 0, x: 1, y: 1 }] }] }],
  ["actors with no marks", { actors: [{ keys: [] }], cameras: [{ keys: [{ t: 0 }] }] }],
]) ok(`refuses ${name}`, sanitize(input) === null);

const base = () => ({
  duration: 8,
  actors: [{ id: "a0", name: "A", color: "#7B3FE4", keys: [{ t: 0, x: 50, y: 50, facing: 0, pose: "stand" }] }],
  cameras: [{ id: "c0", name: "A-cam", keys: [{ t: 0, x: 50, y: 80, rotation: 0 }] }],
});

const h = sanitize({
  ...base(),
  title: "x".repeat(5000),
  duration: 1e9,
  aspect: "<script>alert(1)</script>",
  activeCamera: "nope",
  setId: "gen:11111111-2222-3333-4444-555555555555",
  light: { preset: "../../etc/passwd", bearing: 9e9, warmth: 1e9 },
  beats: Array.from({ length: 5000 }, () => ({ t: -5, label: "b" })),
  extras: Array.from({ length: 5000 }, () => ({ x: NaN, y: "abc", facing: Infinity })),
  hiddenPieces: Array.from({ length: 5000 }, () => "p"),
  nefarious: { deeply: { nested: "payload" } },
  __proto__: { polluted: true },
});
ok("title capped", h.title.length <= 80);
ok("duration clamped", h.duration <= 60 && h.duration >= 1);
ok("unknown aspect defaulted", h.aspect === "16:9");
ok("activeCamera forced to a real camera", h.activeCamera === "c0");
ok("a generated set cannot travel in a share", h.setId === null);
ok("unknown light preset defaulted", h.light.preset !== "../../etc/passwd");
ok("light bearing clamped", h.light.bearing >= 0 && h.light.bearing <= 359);
ok("light warmth clamped", Math.abs(h.light.warmth) <= 1);
ok("beats capped", h.beats.length <= 64);
ok("beat times non-negative", h.beats.every((b) => b.t >= 0));
ok("extras capped", h.extras.length <= 64);
ok("non-numeric coordinates coerced", h.extras.every((e) => Number.isFinite(e.x) && Number.isFinite(e.y)));
ok("hiddenPieces capped", h.hiddenPieces.length <= 260);
ok("unrecognized fields dropped", !("nefarious" in h));
ok("no prototype pollution", Object.prototype.polluted === undefined && !("polluted" in h));

const k = sanitize({
  ...base(),
  duration: 10,
  actors: [{ keys: [
    { t: 9, x: 10, y: 10 }, { t: 3, x: 20, y: 20 }, { t: 3.001, x: 30, y: 30 },
    { t: 99, x: 40, y: 40 }, { t: -4, x: 50, y: 50 },
  ] }],
});
const ts = k.actors[0].keys.map((x) => x.t);
ok("marks sorted", ts.every((t, i) => i === 0 || t > ts[i - 1]), JSON.stringify(ts));
ok("first mark is zero", ts[0] === 0, JSON.stringify(ts));
ok("marks on the same instant collapsed", new Set(ts).size === ts.length);
ok("marks clamped to the duration", ts.every((t) => t <= 10));

const many = sanitize({
  ...base(),
  actors: Array.from({ length: 50 }, () => base().actors[0]),
  cameras: Array.from({ length: 50 }, () => base().cameras[0]),
});
ok("performers capped at six", many.actors.length <= 6);
ok("cameras capped at four", many.cameras.length <= 4);

const long = sanitize({
  ...base(),
  actors: [{ keys: Array.from({ length: 3000 }, (_, i) => ({ t: i * 0.002, x: 50, y: 50 })) }],
});
ok("marks per track capped", long.actors[0].keys.length <= 240);

ok("oversized rejected", tooBig({ blob: "x".repeat(400_000) }));
ok("an ordinary scene is not oversized", !tooBig(STARTERS[1].make()));

if (bad) { console.error(`\ncheck-share FAILED: ${bad} case(s)\n`); process.exit(1); }
console.log(`check-share: ${STARTERS.length} real scenes survive, hostile input refused or clamped.`);
