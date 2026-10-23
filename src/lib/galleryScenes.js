import { build, facing } from "./starters.js";

/*
  galleryScenes — RevaultAI

  Scenes beyond the four you can start from: a shelf of rehearsals that each
  demonstrate one idea about camera or performance, openable in a click.

  These are real blocking, not illustrations. Every position below was chosen
  against the set's own furniture — the kitchen island runs x 49.9–54.1 at
  y 50.0–50.8, the waiting room's benches sit at y 44 and y 54, the office
  desk chair is at y 48.3–49.1 — and scripts/check-starters.mjs validates
  these the same way it validates the starters: nobody walks through a table
  and every camera is framing somebody.

  Coordinates are stage units: 100 x 100, five to the meter, the middle of the
  floor at (50, 50). Bearing 0 looks up the plan, 90 to the right.
*/

/* ---- Over the counter ----------------------------------------------------
   Two people either side of the kitchen island, which does the separating
   that the dialogue would otherwise have to. He comes in and stops at it
   rather than crossing it, and the camera stays low and square to the
   counter so the island reads as the barrier it is.                       */
const counter = build({
  id: "over-the-counter",
  name: "Over the counter",
  note: "Furniture doing the work a line of dialogue would otherwise do",
  title: "Over the counter",
  duration: 10,
  setId: "kitchen",
  light: { preset: "window", bearing: 20 },
  actors: [
    {
      name: "Nell",
      keys: [
        // North of the island, working, and she does not turn round for him.
        { t: 0, x: 52, y: 47.5, facing: 180, pose: "stand", action: "kneel_work" },
        { t: 3.5, x: 52, y: 47.5, facing: 150, pose: "stand", action: "kneel_work" },
        { t: 6, x: 52, y: 47.5, facing: 180, pose: "stand", action: "talking" },
        { t: 10, x: 48, y: 47.5, facing: 200, pose: "stand", action: "talking" },
      ],
    },
    {
      name: "Theo",
      keys: [
        { t: 0, x: 59, y: 57.5, facing: 300, pose: "stand", action: "walk_formal" },
        { t: 3.5, x: 53.5, y: 56.5, facing: 0, pose: "stand", action: "listening" },
        { t: 10, x: 53.5, y: 56.5, facing: 0, pose: "stand", action: "talking" },
      ],
    },
  ],
  cameras: [
    {
      name: "A-cam",
      height: 1.15,
      lens: 35,
      keys: [
        // Low and square to the counter, so the island cuts the frame between
        // them instead of sitting out of shot.
        { t: 0, x: 52, y: 59, rotation: facing({ x: 52, y: 59 }, { x: 52, y: 50 }), height: 1.15, lens: 35 },
        { t: 10, x: 49, y: 58, rotation: facing({ x: 49, y: 58 }, { x: 48, y: 47.5 }), height: 1.2, lens: 40 },
      ],
    },
  ],
  beats: [
    { t: 3.5, label: "he stops at the island" },
    { t: 6, label: "she answers without turning" },
  ],
});

/* ---- The long wait -------------------------------------------------------
   One already seated, one arriving and choosing where to sit. The whole shot
   is a static wide: nothing moves but the people, which is what makes the
   distance between the two benches readable.                              */
const wait = build({
  id: "the-long-wait",
  name: "The long wait",
  note: "A static wide, where the only thing that moves is a decision",
  title: "The long wait",
  duration: 10,
  setId: "waiting-room",
  light: { preset: "single", bearing: 0 },
  actors: [
    {
      name: "Joan",
      keys: [
        // On the far bench the whole time. Stillness is the performance.
        { t: 0, x: 53, y: 44.5, facing: 180, pose: "sit", action: "waiting" },
        { t: 6, x: 53, y: 44.5, facing: 200, pose: "sit", action: "waiting" },
        { t: 10, x: 53, y: 44.5, facing: 180, pose: "sit", action: "waiting" },
      ],
    },
    {
      name: "Aron",
      keys: [
        // In at the door, up the clear lane east of the near benches, then
        // sits as far from her as the room allows.
        // PERSON_RADIUS is 1.5, so the lane between the near bench row (which
        // ends at x 49) and the side table (which starts at x 55.4) is only
        // x 50.5 to 53.9 wide. x 52 clears both by half a unit.
        { t: 0, x: 52, y: 57, facing: 0, pose: "stand", action: "walk_formal" },
        { t: 3, x: 52, y: 50, facing: 0, pose: "stand", action: "walk_formal" },
        { t: 5, x: 48.5, y: 48.5, facing: 320, pose: "stand", action: "still" },
        // Sitting at the bench rather than inside it: the far row occupies
        // y 44.0–44.9, so a seated figure of radius 1.5 has to be past 46.4.
        { t: 7, x: 47, y: 46.8, facing: 180, pose: "sit", action: "waiting" },
        { t: 10, x: 47, y: 46.8, facing: 180, pose: "sit", action: "waiting" },
      ],
    },
  ],
  cameras: [
    {
      name: "A-cam",
      height: 1.35,
      lens: 28,
      keys: [
        // One position, one lens, no move. Off to the side of the door so he
        // walks into the frame rather than past the lens.
        { t: 0, x: 41, y: 58, rotation: facing({ x: 41, y: 58 }, { x: 50, y: 46 }), height: 1.35, lens: 28 },
        { t: 10, x: 41, y: 58, rotation: facing({ x: 41, y: 58 }, { x: 50, y: 46 }), height: 1.35, lens: 28 },
      ],
    },
  ],
  beats: [
    { t: 3, label: "he sees her" },
    { t: 5, label: "he picks the far bench" },
    { t: 7, label: "he sits" },
  ],
});

/* ---- Pacing ---------------------------------------------------------------
   One pacing, one seated and still. The camera pans from a fixed spot to
   follow the pacer, which keeps the seated one drifting in and out of frame
   — the geometry doing what a cut would otherwise have to.                */
const pacing = build({
  id: "pacing",
  name: "Pacing",
  note: "A pan from one spot, so the still character keeps leaving frame",
  title: "Pacing",
  duration: 10,
  setId: "office",
  light: { preset: "lamp", bearing: 160 },
  actors: [
    {
      name: "Devlin",
      keys: [
        // The clear lane at y 46.5: south of the desk, north of the chair.
        { t: 0, x: 41.5, y: 46.5, facing: 90, pose: "stand", action: "walk_formal" },
        { t: 2.5, x: 51, y: 46.5, facing: 90, pose: "stand", action: "talking" },
        { t: 5, x: 41.5, y: 46.5, facing: 270, pose: "stand", action: "talking" },
        { t: 7.5, x: 51, y: 46.5, facing: 90, pose: "stand", action: "talking" },
        { t: 10, x: 46, y: 46.5, facing: 180, pose: "stand", action: "still" },
      ],
    },
    {
      name: "Hale",
      keys: [
        { t: 0, x: 55, y: 54.5, facing: 0, pose: "sit", action: "listening" },
        { t: 5, x: 55, y: 54.5, facing: 350, pose: "sit", action: "listening" },
        { t: 10, x: 55, y: 54.5, facing: 320, pose: "sit", action: "talking" },
      ],
    },
  ],
  cameras: [
    {
      name: "A-cam",
      height: 1.5,
      lens: 50,
      keys: [
        // One position. Only the rotation changes, which is the point.
        { t: 0, x: 49, y: 58, rotation: facing({ x: 49, y: 58 }, { x: 41.5, y: 46.5 }), height: 1.5, lens: 50 },
        { t: 2.5, x: 49, y: 58, rotation: facing({ x: 49, y: 58 }, { x: 51, y: 46.5 }), height: 1.5, lens: 50 },
        { t: 5, x: 49, y: 58, rotation: facing({ x: 49, y: 58 }, { x: 41.5, y: 46.5 }), height: 1.5, lens: 50 },
        { t: 7.5, x: 49, y: 58, rotation: facing({ x: 49, y: 58 }, { x: 51, y: 46.5 }), height: 1.5, lens: 50 },
        { t: 10, x: 49, y: 58, rotation: facing({ x: 49, y: 58 }, { x: 46, y: 46.5 }), height: 1.5, lens: 50 },
      ],
    },
  ],
  beats: [
    { t: 5, label: "he turns back" },
    { t: 10, label: "he stops, and she speaks" },
  ],
});

/* ---- Crossing the park ---------------------------------------------------
   Two people approaching from opposite ends and meeting in the middle, with
   the camera arcing round the meeting point. The arc is the idea: it keeps
   both of them in frame through a move that a static camera would turn into
   two backs.                                                              */
const park = build({
  id: "crossing-the-park",
  name: "Crossing the park",
  note: "An arc that holds two people as they meet, instead of two backs",
  title: "Crossing the park",
  duration: 10,
  setId: "park",
  light: { preset: "golden", bearing: 250 },
  actors: [
    {
      name: "Iris",
      keys: [
        { t: 0, x: 25, y: 47.5, facing: 90, pose: "stand", action: "walk_formal" },
        { t: 6, x: 43, y: 47.5, facing: 90, pose: "stand", action: "walk_formal" },
        { t: 8, x: 48, y: 47.5, facing: 100, pose: "stand", action: "still" },
        { t: 10, x: 48, y: 47.5, facing: 110, pose: "stand", action: "talking" },
      ],
    },
    {
      name: "Peter",
      keys: [
        { t: 0, x: 75, y: 47.5, facing: 270, pose: "stand", action: "walk_formal" },
        { t: 6, x: 59, y: 47.5, facing: 270, pose: "stand", action: "walk_formal" },
        { t: 8, x: 54, y: 47.5, facing: 280, pose: "stand", action: "still" },
        { t: 10, x: 54, y: 47.5, facing: 290, pose: "stand", action: "listening" },
      ],
    },
  ],
  cameras: [
    {
      name: "A-cam",
      height: 1.45,
      lens: 50,
      keys: [
        // An arc round the point they meet at, so neither of them turns away
        // from the lens as they close the distance.
        // Opens on Iris, who is the one walking into the shot, and settles on
        // the point they meet at once both are there.
        { t: 0, x: 51, y: 64, rotation: facing({ x: 51, y: 64 }, { x: 30, y: 47.5 }), height: 1.45, lens: 35 },
        { t: 6, x: 60, y: 61, rotation: facing({ x: 60, y: 61 }, { x: 48, y: 47.5 }), height: 1.45, lens: 40 },
        { t: 10, x: 66, y: 55, rotation: facing({ x: 66, y: 55 }, { x: 51, y: 47.5 }), height: 1.4, lens: 65 },
      ],
    },
  ],
  beats: [
    { t: 6, label: "they see each other" },
    { t: 8, label: "both stop" },
  ],
});

export const GALLERY = [counter, wait, pacing, park];

export function getGalleryScene(id) {
  return GALLERY.find((s) => s.id === id) ?? null;
}
