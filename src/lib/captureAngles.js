/*
  The angle vocabulary for a capture — shared by the phone screen that shoots
  the frames and the endpoint that accepts them, so the two can never
  disagree about what a valid angle is.

  Why a fixed list rather than "upload as many as you like": the models take
  9 to 12 reference images, and what makes a pack hold up is coverage, not
  count. Six frames of the same forward-facing smile is one frame with extra
  steps. Naming the angles also gives the database a cap for free — one row
  per angle per session — and gives the phone something concrete to ask for,
  which is the difference between somebody shooting six usable frames and
  giving up after two.

  FRONT is required and is the only one whose description becomes the pack.
  Every frame is gated, but one of them has to be the canonical read, and a
  face looking at the camera is the only honest candidate.
*/

export const ANGLES = [
  { id: "front", label: "Straight at the camera", note: "Chin level, eyes on the lens.", required: true },
  { id: "three-quarter-left", label: "Turn a little left", note: "About halfway to your shoulder." },
  { id: "three-quarter-right", label: "Turn a little right", note: "The same, the other way." },
  { id: "profile-left", label: "Full left profile", note: "Nose pointing off the frame." },
  { id: "profile-right", label: "Full right profile", note: "And the other side." },
  { id: "chin-down", label: "Look slightly down", note: "Camera a little above you." },
  { id: "chin-up", label: "Look slightly up", note: "Camera a little below you." },
  { id: "full-body", label: "Stand back, head to feet", note: "This is the one that fixes your build." },
];

/* Below four a multi-frame pack is not meaningfully better than a selfie,
   and claiming otherwise on the booth path would be the only dishonest thing
   in the feature. */
export const USABLE_SET = 4;

export const ANGLE_IDS = ANGLES.map((a) => a.id);

export function angleById(id) {
  return ANGLES.find((a) => a.id === id) ?? null;
}

/* What the capture screen asks for next: required first, then the rest in
   order, skipping anything already shot. */
export function nextAngle(shot = []) {
  const done = new Set(shot);
  return ANGLES.find((a) => !done.has(a.id)) ?? null;
}

export function captureIsUsable(shot = []) {
  return shot.includes("front") && shot.length >= USABLE_SET;
}
