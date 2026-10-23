/*
  rehearsalSections — RevaultAI

  The sections below the Rehearsal Studio, as data rather than markup, because
  two things render them and they must not drift:

    1. RehearsalSections.jsx, for someone looking at the page, with a diagram
       beside each one.
    2. scripts/prerender.js, which writes the static HTML a crawler reads.
       A heading that exists only after React mounts is a heading search
       engines never see, which would make this whole exercise decorative.

  `visual` names the diagram the React side draws; the prerender ignores it.
  Copy is kept to what the tool actually does — every claim here is something
  a visitor can go and check a few hundred pixels further up the page.
*/

export const REHEARSAL_SECTIONS = [
  {
    id: "previz",
    eyebrow: "Previz",
    h2: "Previz and scene blocking for AI video",
    copy: "Previsualization used to mean a storyboard artist or a week in Maya. Block the scene here instead, in the browser, and arrive at the generator knowing where everyone stands, what the lens is doing and which side of the line the camera is on.",
    visual: "scene",
  },
  {
    id: "over-time",
    eyebrow: "Timeline",
    h2: "Block performance over time, not one frozen pose",
    copy: "Scrub to a moment, move someone, and a keyframe is written there. The walk between marks fills itself in, so a scene has a shape — she sits through the first half, he is on his feet by the end — instead of being a single arrangement of people.",
    visual: "timeline",
  },
  {
    id: "camera-moves",
    eyebrow: "Camera",
    h2: "Camera control and camera moves that run over time",
    copy: "Dolly, truck, pan, arc, crane and zoom, each written as two marks you can drag afterwards. Set the lens from 18mm to 100mm and the height from the floor to overhead, and the shot size follows the geometry rather than a dropdown.",
    visual: "moves",
  },
  {
    id: "coverage",
    eyebrow: "Coverage",
    h2: "One performance, every angle",
    copy: "Add up to four cameras to the same blocking. The performance does not change when you switch between them — only the angle does, which is the whole reason coverage cuts together. Each camera reports its own shot size, lens and subject.",
    visual: "angles",
  },
  {
    id: "walk-the-camera",
    eyebrow: "Full screen",
    h2: "Walk the camera through the set",
    copy: "Step onto the set and fly the camera you are actually shooting with, on W A S D, Q and E for height. Every adjustment lands on the timeline as a mark, so finding an angle by walking to it is the same act as blocking it.",
    visual: "walk",
  },
  {
    id: "continuity",
    eyebrow: "Continuity",
    h2: "Spatial continuity across shots",
    copy: "The 180° line is drawn for you, eyelines are read back in words, and the plan says so the moment a camera crosses to the wrong side. Catching that here costs nothing; catching it after you have generated both shots costs two generations.",
    visual: "continuity",
  },
  {
    id: "start-and-export",
    eyebrow: "Starting and finishing",
    h2: "Start from a scene, take the blocking with you",
    copy: "The studio opens on a scene that's already blocked: a walk-and-talk, a dinner argument or a standoff. Your blocking is saved in this browser as you work, with no account needed. Sign in to keep it for good. When the blocking is ready, hand it over as a captioned storyboard sheet, an animatic MP4 rendered in your browser, or a share link. No account is needed for any of that: a link made without one works for 30 days, and signing in makes it permanent.",
    visual: "handoff",
  },
];

// The static HTML a crawler reads. Headings and copy only — the diagrams are
// decoration and carry nothing a search engine wants.
export function sectionsHtml(esc) {
  return REHEARSAL_SECTIONS
    .map((s) => `<h2>${esc(s.h2)}</h2><p>${esc(s.copy)}</p>`)
    .join("");
}
