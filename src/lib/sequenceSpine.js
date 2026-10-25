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
    gaps.push({ id: "nothing_rendered", why: "no shot has a chosen take, so there is no output to check against" });
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
