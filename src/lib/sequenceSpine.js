/*
  sequenceSpine — RevaultAI

  What a sequence is supposed to contain, shot by shot, so that something can
  later check what was actually produced against it.

  Three features were going to be built separately and would have built this
  three times: drift detection needs to know what should have stayed the same,
  selective regeneration needs to know which shots a change reaches, and a
  dialogue or contact sheet needs somewhere to hang a beat-level fact. All
  three are the same question — what is this sequence made of — asked at
  different moments. The Lot already demonstrated what happens otherwise:
  three lists of the same tools, disagreeing.

  DERIVED, NEVER AUTHORED. Every fact here is read out of a Shot Spec that
  tools already write. Nothing asks the creator for anything new. That is the
  same bet Story Worlds made and lost, so it is checked rather than assumed:
  spine-gate.js runs this across real projects and reports what fraction have
  enough to work with, before anything is built on top.

  The difference from Story Worlds, and the reason this is worth re-betting:
  that read finished takes and asked them to describe a world. This reads the
  PLAN — authored, structured, already stored as jsonb — and only then goes
  looking at output. A plan that is thin is visibly thin. A take that is thin
  looks exactly like a take that is fine.

  THE CENTRAL IDEA IS THE CARRIER. Continuity is not a property of one shot;
  it is a fact appearing in more than one. A coat nobody wears twice cannot
  be inconsistent, and a sequence where nothing recurs has no continuity to
  get wrong — which is a real and common verdict, not a failure to parse.
  So the spine's primary output is the list of facts that carry, and the
  count of shots each one spans.
*/

/*
  The dimensions that can carry between shots. Each names where it is read
  from and how two instances are judged the same thing, because "the same
  coat" is a string comparison and nothing more clever would be honest.
*/
export const DIMENSIONS = [
  { id: "cast", label: "Who is in it", from: "subjects.characters" },
  { id: "location", label: "Where it is", from: "subjects.locations" },
  { id: "prop", label: "What is handled", from: "subjects.props" },
  { id: "lock", label: "Continuity locks", from: "continuityLocks" },
  { id: "lighting", label: "How it is lit", from: "lighting" },
  { id: "direction", label: "Screen direction", from: "composition.screenDirection" },
];

export const DIMENSION_IDS = DIMENSIONS.map((d) => d.id);

/* A sequence of one shot is not a sequence. Two is the smallest thing a
   continuity check can have an opinion about. */
export const MIN_SHOTS = 2;

function text(v) {
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
}

/* Facts are matched by their normalized text. Case and spacing vary between
   tools that write the same spec; meaning does not. */
function key(dimension, value) {
  return dimension + ":" + text(value).toLowerCase();
}

function list(v) {
  return Array.isArray(v) ? v.map(text).filter(Boolean) : [];
}

/*
  A continuity lock arrives as a line of prose. Where it names a character,
  "Ruth: soaked jacket", the subject is worth keeping separate from the state
  so a later check can ask about Ruth's jacket rather than about a sentence.
  Where it does not, the whole line is the fact and that is fine.
*/
export function parseLock(line) {
  const t = text(line);
  if (!t) return null;
  const at = t.indexOf(":");
  if (at > 0) {
    const subject = t.slice(0, at).trim();
    const state = t.slice(at + 1).trim();
    /*
      Two tests, because one is not enough. "the clock stays at 4:15" has a
      colon at a plausible position and splitting on it produces the subject
      "the clock stays at 4", which would then be matched against other shots
      as if it were a character. So the colon must be followed by a space,
      which a clock time is not, and the subject must read like a name rather
      than a clause.
    */
    const separated = /\s/.test(t.charAt(at + 1));
    const nameLike = subject.length <= 40 && subject.split(" ").length <= 4;
    if (subject && state && separated && nameLike) return { subject, state, raw: t };
  }
  return { subject: null, state: t, raw: t };
}

/* Lighting is four fields that only mean something together: a key direction
   with no quality is not a lit scene, it is half a note. Joined into one
   fact so two shots agree or do not. */
export function lightingFact(spec) {
  const l = spec?.lighting ?? {};
  const parts = [l.keyDirection, l.quality, l.contrast, l.practicals].map(text).filter(Boolean);
  return parts.length ? parts.join(", ") : "";
}

/*
  One shot's facts, by dimension. Pure: it reads a spec and returns what is
  in it, with no opinion about whether that is enough.
*/
export function factsFor(spec) {
  const out = {};
  for (const id of DIMENSION_IDS) out[id] = [];

  out.cast = list(spec?.subjects?.characters);
  out.location = list(spec?.subjects?.locations);
  out.prop = list(spec?.subjects?.props);

  for (const line of list(spec?.continuityLocks)) {
    const parsed = parseLock(line);
    if (parsed) out.lock.push(parsed.raw);
  }

  const lit = lightingFact(spec);
  if (lit) out.lighting = [lit];

  const dir = text(spec?.composition?.screenDirection);
  if (dir) out.direction = [dir];

  return out;
}

/*
  The spine.

  `shots` are expected in the order they play. Each one may carry a spec and
  a rendered generation; neither is required, because a sequence half-planned
  and half-shot is the normal state of a film in progress and the spine has to
  describe it rather than refuse it.
*/
export function spineFrom({ title = "", shots = [] } = {}) {
  const ordered = Array.isArray(shots) ? shots : [];

  const beats = ordered.map((shot, i) => {
    const spec = shot?.spec ?? null;
    return {
      index: i,
      id: shot?.id ?? null,
      name: text(shot?.name) || `Shot ${i + 1}`,
      specId: shot?.specId ?? null,
      specVersion: Number.isFinite(shot?.specVersion) ? shot.specVersion : null,
      rendered: !!shot?.generationId,
      generationId: shot?.generationId ?? null,
      seconds: Number(spec?.timing?.durationSeconds) || null,
      /* Kept beside the facts rather than among them: an ending state is a
         description of one moment, not a thing that can recur, so it must
         never become a carrier. */
      endState: text(spec?.action?.endState),
      facts: factsFor(spec),
      hasSpec: !!spec,
    };
  });

  /*
    Carriers: a fact and every beat it appears in. Only facts spanning two or
    more beats are continuity at all — the rest are set dressing for one shot,
    and counting them as continuity would inflate every number here.
  */
  const seen = new Map();
  for (const beat of beats) {
    for (const dimension of DIMENSION_IDS) {
      for (const value of beat.facts[dimension]) {
        const k = key(dimension, value);
        if (!seen.has(k)) seen.set(k, { dimension, value, beats: [] });
        const entry = seen.get(k);
        if (!entry.beats.includes(beat.index)) entry.beats.push(beat.index);
      }
    }
  }

  const carries = [...seen.values()]
    .filter((c) => c.beats.length >= 2)
    .sort((a, b) => b.beats.length - a.beats.length || a.dimension.localeCompare(b.dimension));

  /*
    Blast radius, which is what selective regeneration needs and what nothing
    in the product can currently answer: change this beat, and every later
    beat sharing a carrier with it is downstream of the change. Backwards is
    deliberately not included — a shot already played cannot be affected by a
    change to one that comes after it.
  */
  const downstream = beats.map((beat) => {
    const mine = new Set();
    for (const dimension of DIMENSION_IDS) {
      for (const value of beat.facts[dimension]) mine.add(key(dimension, value));
    }
    const reached = [];
    for (const other of beats) {
      if (other.index <= beat.index) continue;
      const hit = DIMENSION_IDS.some((d) =>
        other.facts[d].some((v) => mine.has(key(d, v))));
      if (hit) reached.push(other.index);
    }
    return reached;
  });

  return {
    title: text(title),
    beats,
    carries,
    downstream,
    counts: {
      shots: beats.length,
      withSpec: beats.filter((b) => b.hasSpec).length,
      rendered: beats.filter((b) => b.rendered).length,
      carriers: carries.length,
    },
  };
}

/*
  What a given shot was supposed to contain, written out for comparison
  against the footage.

  observe-state.js used to compare one field, `action.endState`, and refuse
  the whole check when it was empty. That threw away everything else the spec
  holds and meant a shot with a named cast, a wardrobe lock and stated
  lighting could not be checked at all. The same mistake Story Worlds made:
  read one field, conclude there is nothing there.

  The distinction that matters is WHERE a fact came from. A fact stated only
  in this shot is a plan, and the footage differing from it is often just the
  model making a better choice. A fact carried from an earlier shot is a
  commitment, and the footage differing from it is continuity breaking. They
  read identically in the spec and they are not the same claim, so they are
  labelled separately and the second is the one worth alarming anybody about.
*/
export function planFor(spine, index) {
  const beat = spine?.beats?.[index];
  if (!beat) return { ok: false, text: "", fields: [], committed: [] };

  const committed = [];
  for (const carrier of spine.carries ?? []) {
    /* Carried into this shot from an earlier one. A carrier that only
       reaches forward was established here, so it is a plan, not yet a
       commitment. */
    if (!carrier.beats.includes(index)) continue;
    if (!carrier.beats.some((b) => b < index)) continue;
    committed.push(carrier);
  }

  const lines = [];
  const fields = [];

  const endState = text(beat.endState);
  if (endState) { lines.push(`Ends with: ${endState}`); fields.push("endState"); }

  const f = beat.facts ?? {};
  if (f.cast?.length) { lines.push(`In frame: ${f.cast.join(", ")}`); fields.push("cast"); }
  if (f.location?.length) { lines.push(`Where: ${f.location.join(", ")}`); fields.push("location"); }
  if (f.prop?.length) { lines.push(`Handled: ${f.prop.join(", ")}`); fields.push("prop"); }
  if (f.lighting?.length) { lines.push(`Lit by: ${f.lighting.join("; ")}`); fields.push("lighting"); }
  if (f.direction?.length) { lines.push(`Screen direction: ${f.direction.join(", ")}`); fields.push("direction"); }
  if (f.lock?.length) { lines.push(`Locked: ${f.lock.join("; ")}`); fields.push("lock"); }

  if (committed.length) {
    const carried = committed.map((c) => {
      const first = Math.min(...c.beats.filter((b) => b < index)) + 1;
      return `${c.value} (established in shot ${first})`;
    });
    lines.push("");
    lines.push("CARRIED FROM EARLIER SHOTS \u2014 these are commitments, not intentions:");
    for (const line of carried) lines.push(`- ${line}`);
  }

  return {
    ok: lines.some((l) => text(l)),
    text: lines.join("\n"),
    fields,
    committed: committed.map((c) => ({ dimension: c.dimension, value: c.value, beats: c.beats })),
  };
}

/*
  The sweep: a whole sequence at once, rather than one take at a time.

  observe-state compares a single take against its plan. That is the right
  unit for the work and the wrong unit for the question somebody actually has,
  which is "is this film consistent" — and the answer to that lives across
  shots, not inside one. A jacket that changes in shot seven is invisible from
  inside shot seven.

  WHAT THIS DOES NOT DO: run any vision pass. Frames come off a <video>
  element in the browser, so nothing here can look at footage. The sweep reads
  observations that already exist and reports which beats have none, which is
  honest about the work remaining instead of pretending to have done it.

  ATTRIBUTION IS A HEURISTIC AND IS LABELLED ONE. A beat's verdict comes from
  its observation and is as good as that observation. Tying a particular
  broken thing to a particular commitment is word overlap between the
  difference and the commitment text, nothing cleverer, and it is reported as
  `likely` rather than as fact. Dressing that up would be the one dishonest
  thing in a feature whose entire value is telling the truth about footage.
*/

const STOPWORDS = new Set([
  "the", "and", "with", "that", "this", "from", "into", "onto", "over",
  "under", "their", "there", "where", "which", "while", "still", "been",
  "have", "them", "then", "than", "also", "some", "more", "most", "very",
]);

function distinctive(value) {
  return text(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

/* Does a reported difference appear to be about this commitment? Word
   overlap, deliberately shallow. */
export function mentions(difference, commitment) {
  const hay = [difference?.aspect, difference?.planned, difference?.observed]
    .map((x) => text(x).toLowerCase()).join(" ");
  if (!hay) return false;
  const words = distinctive(commitment);
  if (!words.length) return false;
  return words.some((w) => hay.includes(w));
}

export function sweepFrom({ spine, observations = [] } = {}) {
  const byGeneration = new Map();
  for (const o of observations) {
    if (o?.generation_id) byGeneration.set(o.generation_id, o);
  }

  const beats = (spine?.beats ?? []).map((beat) => {
    const observation = beat.generationId ? byGeneration.get(beat.generationId) ?? null : null;
    const differences = Array.isArray(observation?.differences) ? observation.differences : [];
    const consequential = differences.filter((d) => d?.consequential !== false);

    let status;
    if (!beat.rendered) status = "unfilmed";
    else if (!observation) status = "unchecked";
    else if (consequential.length) status = "broken";
    else status = "held";

    return {
      index: beat.index,
      name: beat.name,
      status,
      /* A settled difference is one the creator already ruled on, so it stops
         counting against the sequence. Adopting a filmed change is a decision,
         not an outstanding problem. */
      settled: observation ? observation.resolution && observation.resolution !== "pending" : false,
      differences: consequential.map((d) => ({
        aspect: text(d?.aspect),
        planned: text(d?.planned),
        observed: text(d?.observed),
        confidence: ["high", "medium", "low"].includes(d?.confidence) ? d.confidence : "medium",
      })),
    };
  });

  /*
    Each commitment, and how it fared in the beats that inherited it. A
    carrier's first beat established it; only the later ones are commitments,
    which is the same rule planFor uses.
  */
  const commitments = (spine?.carries ?? []).map((carrier) => {
    const first = Math.min(...carrier.beats);
    const inherited = carrier.beats.filter((b) => b > first);

    const held = [];
    const unchecked = [];
    const unfilmed = [];
    const likelyBroken = [];

    for (const index of inherited) {
      const beat = beats[index];
      if (!beat) continue;
      if (beat.status === "unfilmed") { unfilmed.push(index); continue; }
      if (beat.status === "unchecked") { unchecked.push(index); continue; }
      if (beat.status === "broken" && !beat.settled
          && beat.differences.some((d) => mentions(d, carrier.value))) {
        likelyBroken.push(index);
        continue;
      }
      held.push(index);
    }

    return {
      dimension: carrier.dimension,
      value: carrier.value,
      establishedIn: first,
      inherited,
      held,
      unchecked,
      unfilmed,
      likelyBroken,
    };
  }).filter((c) => c.inherited.length);

  const counts = {
    beats: beats.length,
    unfilmed: beats.filter((b) => b.status === "unfilmed").length,
    unchecked: beats.filter((b) => b.status === "unchecked").length,
    held: beats.filter((b) => b.status === "held").length,
    broken: beats.filter((b) => b.status === "broken" && !b.settled).length,
    settled: beats.filter((b) => b.settled).length,
    commitments: commitments.length,
    commitmentsAtRisk: commitments.filter((c) => c.likelyBroken.length).length,
  };

  /* What to do next, in the order it is worth doing. A sequence with ten
     unchecked beats does not need advice about lighting. */
  const next = [];
  if (counts.broken) {
    next.push({ id: "resolve", why: `${counts.broken} filmed ${counts.broken === 1 ? "beat differs" : "beats differ"} from the plan and nobody has decided about it` });
  }
  if (counts.unchecked) {
    next.push({ id: "check", why: `${counts.unchecked} filmed ${counts.unchecked === 1 ? "beat has" : "beats have"} never been compared against the plan` });
  }
  if (!counts.beats) next.push({ id: "empty", why: "nothing planned in this project yet" });
  else if (counts.unfilmed === counts.beats) next.push({ id: "unshot", why: "none of these plans has been filmed" });

  return { beats, commitments, counts, next };
}

/*
  Why a spine is not yet usable, named rather than scored, so a bad number
  comes with an instruction. The order matters: the first gap is the one
  worth fixing, and reporting "no locks" about a project with one shot in it
  would aim the fix at the wrong thing.
*/
export function spineGaps(spine) {
  const gaps = [];
  const c = spine?.counts ?? {};

  if ((c.shots ?? 0) < MIN_SHOTS) {
    gaps.push({ id: "single_shot", why: "one shot, so there is no sequence to be consistent across" });
    return gaps;
  }
  if ((c.withSpec ?? 0) < MIN_SHOTS) {
    gaps.push({ id: "no_spec", why: "fewer than two shots carry a Shot Spec, so there is nothing to read" });
    return gaps;
  }
  if (!(c.carriers ?? 0)) {
    gaps.push({ id: "nothing_carries", why: "no fact appears in two shots, so nothing could be inconsistent" });
  }
  if (!spine.carries.some((x) => x.dimension === "cast")) {
    gaps.push({ id: "no_recurring_cast", why: "nobody appears in two shots" });
  }
  if (!spine.carries.some((x) => x.dimension === "lock")) {
    gaps.push({ id: "no_locks", why: "no continuity lock carries, so wardrobe and props are unstated" });
  }
  if (!spine.carries.some((x) => x.dimension === "lighting")) {
    gaps.push({ id: "no_lighting", why: "lighting is unstated, so a change in it cannot be called a change" });
  }
  if (!(c.rendered ?? 0)) {
    gaps.push({ id: "nothing_rendered", why: "nothing made from these plans has been filmed, so there is no output to check against" });
  }
  return gaps;
}

/*
  Usable means: a real sequence, read from real specs, with something that
  carries and something rendered to check it against. Deliberately not a
  percentage score — a spine either has work to do or it does not, and a
  sequence at 60% of a rubric still cannot be checked for drift.
*/
export function spineIsUsable(spine) {
  const blocking = new Set(["single_shot", "no_spec", "nothing_carries", "nothing_rendered"]);
  return !spineGaps(spine).some((g) => blocking.has(g.id));
}
