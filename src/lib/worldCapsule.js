/*
  worldCapsule — RevaultAI

  A capsule is a world, locked.

  The thing worth understanding here is that nothing in this file asks the
  creator for anything. A capsule is extracted from a take they have already
  made, out of data they have already filled in: the Vault entries the take
  referenced, the Shot Spec it compiled from, the ending state the Script
  Supervisor observed in the footage, and the rehearsal it was blocked in. If
  locking a world needed an authoring step, almost nobody would do it, and the
  rooms would be empty. So there is no authoring step.

  The four Vault kinds partition onto a capsule exactly, which is the reason
  this works at all:

    character -> cast     the people a viewer can meet and talk to
    location  -> set      where they are
    prop      -> props    what is in there with them
    look      -> look     how it is all rendered

  What this file does NOT do:

    - It does not sign image URLs. Every image here is stored in the R2
      carrier form (R2_PUBLIC_URL/key), which records where an object lives,
      and is presigned at the moment somebody reads it. A presigned URL baked
      into a capsule would expire in two hours and leave a permanent world
      with dead pictures in it.

    - It does not resolve voices to audio. The capsule carries which Vault
      entry a voice belongs to; the voice itself is resolved server-side from
      the Vault at read time, the same rule the Recording Studio follows, so
      that a forged request cannot make a character speak in someone else's
      voice.

    - It does not fail on thin input. A capsule built from a rough take is
      still a capsule, just a poorer one — the same bargain blankSpec() makes.
      capsuleGaps() below says what is missing, and the caller decides.
*/

export const CAPSULE_VERSION = 1;

/* jsonb with a size ceiling on it, so every free-text field is bounded. */
const cut = (v, n) => String(v ?? "").trim().slice(0, n);

/* Keep only http(s) strings, bounded, de-duplicated, and never more than a
   handful — a capsule carries reference images, not an album. */
function imageList(images, max = 4) {
  if (!Array.isArray(images)) return [];
  const out = [];
  for (const raw of images) {
    const url = typeof raw === "string" ? raw : raw?.url;
    if (typeof url !== "string" || !/^https?:\/\//.test(url)) continue;
    if (out.includes(url)) continue;
    out.push(url.slice(0, 600));
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Build a capsule from one take and everything that take already knows.
 *
 * @param generation  the generations row: id, prompt, model, end_frame_url, …
 * @param spec        the film_specs.spec object, or null
 * @param vault       the vault_entries rows the take referenced
 * @param observed    the observed_states row for the take, or null
 * @param rehearsal   the rehearsals row the take was blocked in, or null
 */
export function capsuleFrom({ generation = null, spec = null, vault = [], observed = null, rehearsal = null } = {}) {
  const gen = generation ?? {};
  const rows = Array.isArray(vault) ? vault : [];
  const of = (kind) => rows.filter((r) => r?.kind === kind);

  /* ---- Cast ------------------------------------------------------------
     De-duplicated by Vault id first and by name second, because a take can
     reference the same entry twice and a world with two of somebody in it is
     a bug a viewer would notice immediately. */
  const seen = new Set();
  const cast = [];
  for (const c of of("character")) {
    const key = c.id ?? cut(c.name, 80).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    cast.push({
      vaultId: c.id ?? null,
      name: cut(c.name, 80),
      description: cut(c.description, 700),
      wardrobe: cut(c.wardrobe, 400),
      distinguishing: cut(c.distinguishing, 400),
      images: imageList(c.images),
      /* Which voice, not the voice. Resolved from the Vault at read time. */
      voice: c.voice_preset || c.voice_sample_url
        ? { preset: cut(c.voice_preset, 60) || null, fromVault: true }
        : null,
    });
    if (cast.length >= 8) break;
  }

  /*
    Characters the Shot Spec names, for a take that referenced no Vault entry
    at all — which, measured against a real corpus, turned out to be most of
    them. A spec built from a scene breakdown carries names in
    subjects.characters and a description for each one in continuityLocks,
    written as "Name: description". That is thinner than a Vault entry — no
    reference images, no voice — but a name and a description is somebody you
    can meet, and the alternative is a world with nobody in it.

    Vault entries win where both exist: they carry wardrobe, images and a
    voice, and they are the identity the creator locked deliberately.
  */
  const lockFor = new Map();
  for (const lock of Array.isArray(spec?.continuityLocks) ? spec.continuityLocks : []) {
    const text = String(lock ?? "");
    const at = text.indexOf(":");
    if (at > 0) lockFor.set(text.slice(0, at).trim().toLowerCase(), text.slice(at + 1).trim());
  }

  for (const named of Array.isArray(spec?.subjects?.characters) ? spec.subjects.characters : []) {
    const name = cut(named, 80);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key) || cast.some((c) => c.name.toLowerCase() === key)) continue;
    seen.add(key);
    cast.push({
      vaultId: null,
      name,
      description: cut(lockFor.get(key), 700),
      wardrobe: "",
      distinguishing: "",
      images: [],
      voice: null,
    });
    if (cast.length >= 8) break;
  }

  /* ---- Set -------------------------------------------------------------
     A Vault location is the best source. Failing that, the Shot Spec named
     some locations in prose. Failing that, the rehearsal at least knows which
     stage set it was blocked on, which is enough for the 3D stage to load. */
  const vaultSet = of("location")[0] ?? null;
  const specLocations = Array.isArray(spec?.subjects?.locations) ? spec.subjects.locations : [];
  const setName = cut(vaultSet?.name, 120) || cut(specLocations[0], 120) || cut(rehearsal?.set_id, 120);
  const set = {
    name: setName,
    description: cut(vaultSet?.description, 700) || cut(lockFor.get(setName.toLowerCase()), 700),
    images: imageList(vaultSet?.images, 2),
    /* The rehearsal's own set, so the stage can be stood up without a model. */
    stageSetId: cut(rehearsal?.data?.setId ?? rehearsal?.set_id, 60) || null,
    light: rehearsal?.data?.light ?? null,
  };

  /* ---- Props and look --------------------------------------------------- */
  const props = of("prop").slice(0, 10).map((p) => ({
    vaultId: p.id ?? null,
    name: cut(p.name, 80),
    description: cut(p.description, 300),
  })).filter((p) => p.name);

  /* And the props the spec names, described by their own continuity lock. */
  for (const named of Array.isArray(spec?.subjects?.props) ? spec.subjects.props : []) {
    const name = cut(named, 80);
    if (!name || props.some((x) => x.name.toLowerCase() === name.toLowerCase())) continue;
    props.push({ vaultId: null, name, description: cut(lockFor.get(name.toLowerCase()), 300) });
    if (props.length >= 10) break;
  }

  const vaultLook = of("look")[0] ?? null;
  const look = {
    look: cut(spec?.style?.look, 300) || cut(vaultLook?.description, 300),
    palette: cut(spec?.style?.palette, 200),
    texture: cut(spec?.style?.texture, 200),
  };

  /* ---- State ------------------------------------------------------------
     The condition the world is actually in. Two sources, and the order
     matters: what the Script Supervisor saw in the footage beats what the
     spec planned, because the footage is what happened. A plan that said the
     door closes and footage that shows it open describes two different
     worlds, and the viewer is about to walk into the second one. */
  const observedText = cut(observed?.observed_end, 900);
  const plannedText = cut(spec?.action?.endState, 900);
  const carried = (Array.isArray(observed?.differences) ? observed.differences : [])
    .filter((d) => d?.consequential !== false && d?.confidence !== "low")
    .slice(0, 6)
    .map((d) => ({ aspect: cut(d.aspect, 100), is: cut(d.observed, 300) }))
    .filter((d) => d.aspect && d.is);

  const state = {
    text: observedText || plannedText,
    source: observedText ? "observed" : plannedText ? "planned" : "none",
    /* Facts that carried out of the take and are true on arrival. A character
       asked about the door should know it is open. */
    carried,
    locks: (Array.isArray(spec?.continuityLocks) ? spec.continuityLocks : [])
      .slice(0, 12).map((l) => cut(l, 300)).filter(Boolean),
  };

  /* ---- The way in -------------------------------------------------------
     The frame the take actually ended on is exactly the right establishing
     image for a world entered after it: it is the last thing that was true. */
  const entry = {
    imageUrl: typeof gen.end_frame_url === "string" && /^https?:\/\//.test(gen.end_frame_url)
      ? gen.end_frame_url.slice(0, 600) : null,
    atSeconds: Number.isFinite(Number(gen.end_frame_at)) ? Number(gen.end_frame_at) : null,
  };

  /* ---- Where it came from ----------------------------------------------
     One beat, not a list. What happens IN a world lives in its own
     append-only table, for two reasons: re-locking a take after somebody has
     observed it rewrites the derived fields here, which would take the room's
     memory with it; and appending to a jsonb array is a read-modify-write,
     so two people adding a beat at once in a shared room would silently lose
     one of them. The capsule records how the world came to exist. The beats
     table records what has happened since. */
  const origin = {
    at: gen.completed_at ?? gen.created_at ?? null,
    text: cut(spec?.identity?.purpose, 300) || cut(gen.prompt, 300),
  };

  return {
    _v: CAPSULE_VERSION,
    title: cut(spec?.identity?.title, 140) || cut(rehearsal?.title, 140) || cut(gen.prompt, 140),
    logline: cut(spec?.identity?.purpose, 300),
    cast,
    set,
    props,
    look,
    state,
    entry,
    origin,
    provenance: {
      generationId: gen.id ?? null,
      model: cut(gen.model, 80),
      specId: gen.film_spec_id ?? null,
      specVersion: gen.film_spec_version ?? null,
      projectId: gen.project_id ?? null,
      rehearsalId: rehearsal?.id ?? null,
      lockedAt: new Date().toISOString(),
    },
  };
}

/*
  What is missing, and is it enough to walk into?

  `usable` is the floor, and it is deliberately low: somebody to meet,
  somewhere to be, and some condition the place is in. Everything else makes a
  world better without being the difference between a room and no room.

  This is also the measurement the first gate is made of — "do most takes
  build a usable capsule" is a question you can only answer if usable means
  one fixed thing.
*/
export function capsuleGaps(capsule) {
  const c = capsule ?? {};
  const missing = [];
  const thin = [];

  const named = (c.cast ?? []).filter((p) => p.name);
  const speakers = named.filter((p) => p.description);
  if (!named.length) {
    missing.push("nobody in it — no Vault character and none named by the spec");
  } else if (!speakers.length) {
    /* Distinct from having nobody: the take knows who is in the scene but
       nothing about them, which is one continuity lock away rather than a
       rebuild. Saying so is the difference between a fixable gap and a
       dead end. */
    missing.push("characters are named but not described — no Vault entry and no continuity lock");
  }
  if (!c.state?.text) missing.push("no world state — the take has neither an observed nor a planned ending");
  if (!c.set?.name && !c.set?.stageSetId) missing.push("nowhere to be — no location and no rehearsal set");

  if (!c.entry?.imageUrl) thin.push("no establishing frame, so arrival has no picture");
  if (!(c.cast ?? []).some((p) => p.voice)) thin.push("nobody has a voice yet");
  if (!c.set?.stageSetId) thin.push("no blocked set, so the 3D stage cannot be stood up");
  if (!(c.props ?? []).length) thin.push("no props");
  if (!c.look?.look) thin.push("no look locked, so generated frames may drift");
  if (!c.state?.carried?.length && c.state?.source === "planned") {
    thin.push("state is the plan, not the footage — nobody has observed this take");
  }

  return { usable: missing.length === 0, missing, thin, castSize: speakers.length };
}
