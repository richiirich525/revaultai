/*
  generatorCatalog.js — the models and finishing tools offered on /generate.

  Shared by AiVideoGeneratorPage.jsx and scripts/prerender.js so the marketing
  page and the crawler-facing static page can't drift. Blurbs describe what each
  model is actually configured to do in api/generate-video.js — audio in
  particular, since only some tiers have it enabled.
*/

export const GEN_MODELS = [
  {
    name: "Seedance 2.5",
    by: "ByteDance",
    note: "The flagship. Native synchronized audio in the same pass as the picture, up to 30 seconds in a single generation, and reference-to-video that takes a dozen images at once — so characters, locations and props all arrive matched. The most expensive model here, with a 480p draft tier at half the credits for finding the shot before you pay for it.",
  },
  {
    name: "Seedance 2.0",
    by: "ByteDance",
    note: "Director-level camera control at a fraction of 2.5's cost. Dolly zooms, rack focus and tracking shots execute rather than approximate, and physics hold up under pressure — collisions carry weight and fabric tears believably. Picture only, also available as a 480p draft tier.",
  },
  {
    name: "Veo 3.1",
    by: "Google DeepMind",
    note: "The strongest all-around image quality, with native audio and lip-synced dialogue generated alongside the picture in multiple languages. Best for hero shots that need to look expensive, or any shot where someone has to speak.",
  },
  {
    name: "Kling 3.0",
    by: "Kuaishou",
    note: "The motion specialist. Fast action, physical performance, crowds and fight choreography hold together where other models smear. Its reference mode takes each entry as an element and generates audio with the shot.",
  },
  {
    name: "Wan 2.6",
    by: "Alibaba",
    note: "The workhorse, and the cheapest thing here by a wide margin. Fast enough to iterate without rationing takes, which is what previz and blocking actually need. It won't take reference photos, and it generates no audio — but it will animate to an audio track you supply.",
  },
];

export const GEN_TOOLS = [
  ["Image to video", "Attach a starting frame and any model animates from it. Your still becomes the first frame instead of a description the model has to guess at."],
  ["Upscale", "Take a finished clip to 1080p or 4K with temporal consistency — no shimmer or flicker between frames. Pairs with the 480p draft tier: iterate cheap, upscale the keeper."],
  ["Extend", "Continue a clip past its original length with consistent motion, style, and audio. Chain extensions to build past the ceiling every model shares."],
  ["Lip sync", "Upload an audio track and the mouth is re-timed to match it, carrying emotion and speaking style from the recording. Dialogue without a reshoot."],
];
