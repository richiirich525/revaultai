import { COLORS } from "./rehearsal.js";
import { defaultLight } from "./lighting.js";

/*
  starters — RevaultAI

  Three scenes that are already blocked, so the studio opens with movement in
  it rather than two people standing still on an empty floor. Each one is a
  real rehearsal: multiple keyframes per performer, a camera that does
  something, and beats on the timeline.

  Coordinates are stage units — 100 x 100, five to the meter, the middle of
  the floor at (50, 50). A bearing of 0 looks up the plan, 90 to the right.
  Positions were chosen against each set's own floor and furniture, and the
  check in scripts/check-starters.mjs confirms nobody walks through a table
  and that every camera is framing somebody.
*/

// Which way one point has to face to look at another.
export const facing = (from, to) =>
  Math.round((Math.atan2(to.x - from.x, -(to.y - from.y)) * 180) / Math.PI + 360) % 360;

export function build(spec) {
  return {
    id: spec.id,
    name: spec.name,
    note: spec.note,
    make: () => ({
      title: spec.title,
      duration: spec.duration,
      setId: spec.setId ?? null,
      setName: null,
      setCustom: null,
      actors: spec.actors.map((a, i) => ({
        id: "a" + i,
        name: a.name,
        color: COLORS[i % COLORS.length],
        body: a.body ?? undefined,
        keys: a.keys,
      })),
      cameras: spec.cameras.map((c, i) => ({
        id: "c" + i,
        name: c.name,
        height: c.height ?? 1.55,
        lens: c.lens ?? null,
        keys: c.keys,
      })),
      activeCamera: "c0",
      beats: spec.beats ?? [],
      aspect: spec.aspect ?? "2.39:1",
      light: { ...defaultLight(), ...(spec.light ?? {}) },
      extras: [],
      hiddenPieces: [],
    }),
  };
}

/* ---- 1. Walk and talk -----------------------------------------------------
   Two people crossing a street corner side by side, talking as they go. The
   camera tracks with them at the same speed, so they hold their place in
   frame while the background moves — the point of the shot.                */
const WALK_A = { x: 30, y: 68 };
const WALK_B = { x: 30, y: 74 };
const walkAndTalk = build({
  id: "walk-and-talk",
  name: "Walk and talk",
  note: "Two people crossing a street, camera tracking with them",
  title: "Walk and talk",
  duration: 10,
  setId: "street-corner",
  light: { preset: "overcast", bearing: 210 },
  actors: [
    {
      name: "Mara",
      keys: [
        { t: 0, x: WALK_A.x, y: WALK_A.y, facing: 90, pose: "stand", action: "talking" },
        { t: 4, x: 48, y: 68, facing: 90, pose: "stand", action: "talking" },
        // She glances across at him mid-sentence, then carries on.
        { t: 5.5, x: 55, y: 68, facing: 120, pose: "stand", action: "talking" },
        { t: 10, x: 72, y: 68, facing: 90, pose: "stand", action: "talking" },
      ],
    },
    {
      name: "Vance",
      keys: [
        { t: 0, x: WALK_B.x, y: WALK_B.y, facing: 90, pose: "stand", action: "listening" },
        { t: 5.5, x: 55, y: 74, facing: 90, pose: "stand", action: "listening" },
        { t: 7, x: 61, y: 74, facing: 60, pose: "stand", action: "talking" },
        { t: 10, x: 72, y: 74, facing: 90, pose: "stand", action: "talking" },
      ],
    },
  ],
  cameras: [
    {
      name: "A-cam",
      height: 1.5,
      lens: 35,
      keys: [
        // Leading them: the camera is ahead down the pavement, walking
        // backwards at their pace with them coming toward it, which is how a
        // walk-and-talk is actually shot. Four meters out, so it is a two
        // shot rather than a pair of noses.
        { t: 0, x: 50, y: 71, rotation: facing({ x: 50, y: 71 }, { x: 30, y: 71 }), height: 1.5, lens: 35 },
        { t: 10, x: 92, y: 71, rotation: facing({ x: 92, y: 71 }, { x: 72, y: 71 }), height: 1.5, lens: 35 },
      ],
    },
  ],
  beats: [
    { t: 0, label: "she is already mid-argument" },
    { t: 5.5, label: "she looks at him" },
    { t: 7, label: "he finally answers" },
  ],
});

/* ---- 2. Dinner argument ---------------------------------------------------
   Both seated across the dining table. He stands up halfway through, which
   is the whole scene: the blocking carries the beat, not the dialogue.     */
const SEAT_A = { x: 51, y: 45 };
const SEAT_B = { x: 51, y: 52.5 };
const CAM_DINNER = { x: 63, y: 58 };
const dinnerArgument = build({
  id: "dinner-argument",
  name: "Dinner argument",
  note: "Two seated at a table, one stands up halfway through",
  title: "Dinner argument",
  duration: 10,
  setId: "dining-room",
  light: { preset: "interior-night", bearing: 40 },
  actors: [
    {
      name: "Ruth",
      keys: [
        { t: 0, x: SEAT_A.x, y: SEAT_A.y, facing: 180, pose: "sit", action: "talking_seated" },
        { t: 4, x: SEAT_A.x, y: SEAT_A.y, facing: 180, pose: "sit", action: "seated_still" },
        { t: 10, x: SEAT_A.x, y: SEAT_A.y, facing: 180, pose: "sit", action: "seated_still" },
      ],
    },
    {
      name: "Daniel",
      keys: [
        { t: 0, x: SEAT_B.x, y: SEAT_B.y, facing: 0, pose: "sit", action: "seated_still" },
        { t: 4, x: SEAT_B.x, y: SEAT_B.y, facing: 0, pose: "sit", action: "talking_seated" },
        // Stands in place — a change of posture, not of position — then walks
        // out along the near side of the table, which is the clear lane.
        { t: 5.5, x: SEAT_B.x, y: SEAT_B.y, facing: 0, pose: "stand", action: "stand_up" },
        { t: 7, x: 55, y: 52.5, facing: facing({ x: 55, y: 52.5 }, SEAT_A), pose: "stand", action: "talking" },
        { t: 10, x: 59, y: 52.5, facing: facing({ x: 59, y: 52.5 }, SEAT_A), pose: "stand", action: "talking" },
      ],
    },
  ],
  cameras: [
    {
      name: "A-cam",
      height: 1.2,
      lens: 50,
      keys: [
        { t: 0, x: CAM_DINNER.x, y: CAM_DINNER.y, rotation: facing(CAM_DINNER, SEAT_A), height: 1.2, lens: 50 },
        // Rises and loosens as he stands, so he does not leave the frame.
        { t: 7, x: 64, y: 61, rotation: facing({ x: 64, y: 61 }, { x: 53, y: 49 }), height: 1.65, lens: 35 },
        { t: 10, x: 64, y: 61, rotation: facing({ x: 64, y: 61 }, { x: 55, y: 50 }), height: 1.7, lens: 35 },
      ],
    },
  ],
  beats: [
    { t: 4, label: "he starts to answer back" },
    { t: 5.5, label: "he stands" },
  ],
});

/* ---- 3. Standoff ----------------------------------------------------------
   Down the length of an alley, which is the shot. Nobody moves much; the
   camera closes the distance instead.                                      */
const STAND_A = { x: 50, y: 30 };
const STAND_B = { x: 50, y: 66 };
const standoff = build({
  id: "standoff",
  name: "Standoff",
  note: "Two down the length of an alley, camera closing in",
  title: "Standoff",
  duration: 10,
  setId: "alley",
  light: { preset: "dusk", bearing: 20 },
  actors: [
    {
      name: "Cole",
      keys: [
        { t: 0, x: STAND_A.x, y: STAND_A.y, facing: 180, pose: "stand", action: "still" },
        { t: 4, x: STAND_A.x, y: STAND_A.y, facing: 180, pose: "stand", action: "pistol_hold" },
        { t: 6, x: STAND_A.x, y: STAND_A.y, facing: 180, pose: "stand", action: "pistol_aim" },
        { t: 10, x: 50, y: 34, facing: 180, pose: "stand", action: "pistol_aim" },
      ],
    },
    {
      name: "Ray",
      keys: [
        { t: 0, x: STAND_B.x, y: STAND_B.y, facing: 0, pose: "stand", action: "still" },
        { t: 5, x: STAND_B.x, y: STAND_B.y, facing: 0, pose: "stand", action: "waiting" },
        { t: 6.5, x: STAND_B.x, y: STAND_B.y, facing: 0, pose: "stand", action: "pistol_hold" },
        { t: 10, x: 50, y: 62, facing: 0, pose: "stand", action: "pistol_aim" },
      ],
    },
  ],
  cameras: [
    {
      name: "A-cam",
      height: 1.45,
      lens: 50,
      keys: [
        { t: 0, x: 50, y: 84, rotation: facing({ x: 50, y: 84 }, STAND_B), height: 1.45, lens: 50 },
        { t: 10, x: 50, y: 76, rotation: facing({ x: 50, y: 76 }, { x: 50, y: 62 }), height: 1.45, lens: 75 },
      ],
    },
  ],
  beats: [
    { t: 4, label: "his hand moves" },
    { t: 6.5, label: "the other one answers" },
  ],
});

export const STARTERS = [walkAndTalk, dinnerArgument, standoff];

export function getStarter(id) {
  return STARTERS.find((s) => s.id === id) ?? null;
}
