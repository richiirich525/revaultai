import { protectedTermIn } from "./stylePresets.js";

/*
  A day becomes a scene.

  The inputs are a line the person wrote, a handful of photos already read
  for setting, and the characters who are allowed on screen. The output is
  one sentence of action for the prompt compiler, which then does what it
  always does: pack block, scene, style, negative.

  WHY THE NOTE LEADS. The photos say where somebody was. Only the note says
  what the day was. A photo of a parking structure and a photo of a hospital
  corridor describe the same afternoon as a triumph or a catastrophe, and
  nothing in an image tells you which. So the note is the scene and the
  photos are the set.

  WHO IS ON SCREEN. Only the packs handed in, which the server has already
  checked against live grants. Everybody else named in the note stays in the
  note: "lunch with my mother" films as a woman having lunch, from no
  reference photo, which is a description and not a likeness. That is the
  line this whole feature walks, and it is worth saying out loud rather than
  leaving implied — a person rendered from words is generic, a person
  rendered from their own locked pack is themselves, and there is no third
  category here.
*/

/* A day is one shot, not a montage. Five seconds of one real moment beats a
   cut of five generated ones, and it costs a fifth as much. */
export const DAY_SECONDS = 5;

const SETTING_FIELDS = ["setting", "timeOfDay", "weather"];

function clean(text, max) {
  return typeof text === "string" ? text.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

/*
  The set, assembled from whatever the photos actually reported. First photo
  wins on any field: a day has one establishing shot, and averaging four
  descriptions of four rooms produces a room that does not exist.
*/
export function settingFrom(photos = []) {
  const out = {};
  for (const field of SETTING_FIELDS) {
    for (const p of photos) {
      const v = clean(p?.read?.[field], 160);
      if (v) { out[field] = v; break; }
    }
  }
  const activities = [];
  for (const p of photos) {
    const v = clean(p?.read?.activity, 160);
    if (v && !activities.includes(v)) activities.push(v);
  }
  out.activity = activities.slice(0, 2).join(", ");
  return out;
}

export function dayScene({ note, photos = [], cast = [] } = {}) {
  const errors = [];
  const warnings = [];

  const line = clean(note, 600);
  if (!line) {
    errors.push("Write a line about the day. Without it there is nothing to film.");
    return { ok: false, scene: "", setting: {}, errors, warnings };
  }

  /*
    A note is free text going into a prompt, so it is the one field here that
    can carry something it should not. This catches the studios, franchises
    and directors on the protected list. It does NOT catch an arbitrary
    famous person's name, because there is no list of those in this product
    — the same gap build-pack.js names around public figures, and it wants
    the same dedicated service.
  */
  const term = protectedTermIn(line);
  if (term) {
    errors.push(`A day cannot mention "${term}". Describe what happened in your own words.`);
    return { ok: false, scene: "", setting: {}, errors, warnings };
  }

  const named = cast.map((c) => clean(c?.name, 60)).filter(Boolean);
  if (!named.length) {
    errors.push("Pick which character plays you.");
    return { ok: false, scene: "", setting: {}, errors, warnings };
  }

  const setting = settingFrom(photos);
  if (!photos.length) {
    warnings.push("No photos, so the scene has only your words to go on. It will look like nowhere in particular.");
  } else if (!setting.setting) {
    warnings.push("The photos did not tell us where this was, so the scene is set loosely.");
  }

  const parts = [];

  /* Who, by name, because the compiler's pack block is keyed to names and a
     pronoun in a two-person scene is a coin flip. */
  parts.push(named.length === 1 ? `${named[0]} is the subject.` : `${named.join(" and ")} are the subjects.`);

  parts.push(`What happens: ${line}`);

  if (setting.setting) parts.push(`Where: ${setting.setting}.`);
  if (setting.timeOfDay) parts.push(`Time of day: ${setting.timeOfDay}.`);
  if (setting.weather) parts.push(`Weather: ${setting.weather}.`);
  if (setting.activity) parts.push(`Also visible: ${setting.activity}.`);

  /*
    The instruction that keeps this honest. Without it the model fills a
    frame with whoever it likes, and a life film full of invented
    recognizable strangers is a worse outcome than a sparse one.
  */
  parts.push(
    named.length === 1
      ? "Nobody else is recognizable in frame."
      : "Nobody beyond the named subjects is recognizable in frame.",
  );

  return { ok: true, scene: parts.join(" "), setting, errors, warnings };
}
