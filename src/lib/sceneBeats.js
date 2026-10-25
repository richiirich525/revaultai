/*
  sceneBeats — RevaultAI

  What happens in a Cast Yourself scene.

  Deliberately few, and deliberately small. A beat is one action with one
  camera move, written so it works in any genre: the same "walks in and
  stops" is a detective entering an alley or a pilot crossing a hangar,
  because the genre preset supplies everything about how it looks and the
  beat supplies only what happens.

  Why not a text box. Six to ten seconds holds one action. A creator given a
  blank field writes a paragraph, the model renders the first clause and
  ignores the rest, and the creator concludes the product is bad at its job.
  A beat that fits the clip is a better result than a free field, and it is
  also where every IP problem would otherwise arrive.

  Each beat names the character with {NAME} so the compiler can put the real
  name in. Names, never pronouns — a pronoun with two people in frame is the
  most reliable way to make a model merge them.
*/

export const BEATS = [
  {
    id: "walks-in",
    label: "Walks in",
    note: "Enters frame and stops",
    words: "{NAME} walks into frame from camera left and stops, looking off camera right. Slow push in from a low angle.",
  },
  {
    id: "turns-to-camera",
    label: "Turns to camera",
    note: "Looks up and finds the lens",
    words: "{NAME} is looking down, then raises their head and finds the lens. The camera holds still. No cut.",
  },
  {
    id: "waits",
    label: "Waits",
    note: "Stillness, and the camera moves instead",
    words: "{NAME} stands completely still, barely breathing, eyes fixed on something off camera. The camera arcs slowly around them.",
  },
  {
    id: "looks-back",
    label: "Looks back",
    note: "Walking away, then turning",
    words: "{NAME} walks away from the lens, stops, and turns their head back over one shoulder. The camera stays where it is.",
  },
  {
    id: "sits-down",
    label: "Sits down",
    note: "Arrives somewhere and settles",
    words: "{NAME} crosses the frame, sits down heavily, and exhales. The camera lowers with them and settles at eye level.",
  },
  {
    id: "reacts",
    label: "Reacts",
    note: "Hears something off camera",
    words: "{NAME} hears something off camera and turns sharply toward it, body following a beat after the head. The camera pushes in quickly.",
  },
];

export function beatById(id) {
  return BEATS.find((b) => b.id === id) ?? null;
}

/**
 * Fill a beat with the cast. One name for a solo shot; for two or three,
 * the first takes the beat and the others are placed around them, named,
 * never pronouns.
 */
export function beatFor(beat, packs) {
  const names = packs.map((p) => String(p.name ?? "").trim().toUpperCase()).filter(Boolean);
  if (!beat || !names.length) return "";
  let text = beat.words.replace(/\{NAME\}/g, names[0]);
  if (names.length === 2) {
    text += ` ${names[1]} is already in frame, to one side, watching ${names[0]} and not moving.`;
  } else if (names.length > 2) {
    text += ` ${names.slice(1, -1).join(", ")} and ${names.at(-1)} are already in frame, spread across it, watching ${names[0]}.`;
  }
  return text;
}
