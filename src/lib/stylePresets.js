/*
  stylePresets — RevaultAI

  How a scene is rendered, kept deliberately apart from who is in it.

  The pack says WHO. A preset says HOW IT LOOKS. Keeping them in separate
  slots is what lets the same person appear as an anime character and then as
  a photoreal lead without the identity moving, which is the single claim this
  product makes that competitors cannot.

  Two kinds, and the split is a product decision rather than a technical one:

    medium  Animate Yourself — you as a drawing. Cheap, instantly shareable,
            and a harder proof of locked identity than any lighting change.
    genre   Cast Yourself — you, photoreal, in a kind of film.

  WHY THERE IS NO TEXT BOX. A preset is a fixed string the server resolves
  from an id. The creator picks; they never type the look. That is the quality
  control, and it is also the legal control: a free-text style field is where
  "make me a Pixar character" arrives.

  WHY NO PRESET IS NAMED AFTER A STUDIO. A medium is a technique and nobody
  owns it. A studio's house style belongs to a company with a legal team, and
  a preset named after one is an invitation addressed to them. Every name here
  describes a technique or a genre; scripts/check-presets.mjs fails the build
  if that ever stops being true.

  `words` is the fragment that reaches the model, written the way a DP or an
  art director would say it — look, palette, lens, era — because concrete
  craft language lands and adjectives do not.
*/

export const MEDIUMS = [
  {
    id: "cel-shade", label: "Cel Shade", kind: "medium",
    note: "Hand-inked animation, flat color, hard shadow edges",
    words: "cel-shaded hand-drawn animation, clean black ink outlines of even weight, flat color fills, hard-edged two-tone shadows, limited palette of six colors, painted background held slightly softer than the figures",
  },
  {
    id: "ink-halftone", label: "Ink and Halftone", kind: "medium",
    note: "Comic book interior, brush ink and dot screens",
    words: "comic book interior art, heavy brush-inked contours with tapering line weight, benday halftone dot shading, spot blacks, slightly misregistered four-color printing on absorbent newsprint",
  },
  {
    id: "sunday-funnies", label: "Sunday Funnies", kind: "medium",
    note: "Newspaper strip, loose line, flat primaries",
    words: "newspaper comic strip art, loose confident pen line, simplified features, flat primary colors, visible paper tooth, gentle registration drift, generous white space",
  },
  {
    id: "stop-motion-clay", label: "Stop-Motion Clay", kind: "medium",
    note: "Modeled figures, thumbprints, practical light",
    words: "stop-motion clay animation, hand-modeled figures with visible thumbprints and seam lines, matte plasticine surfaces, shallow depth of field from a macro lens, warm practical tabletop lighting, subtle frame-to-frame jitter",
  },
  {
    id: "watercolor-wash", label: "Watercolor Wash", kind: "medium",
    note: "Wet-on-wet, bleeding edges, paper grain",
    words: "watercolor illustration, wet-on-wet washes with blooming edges, pigment granulating into cold-press paper grain, white of the paper left for highlights, loose graphite underdrawing showing through",
  },
  {
    id: "pencil-rough", label: "Pencil Rough", kind: "medium",
    note: "Storyboard sketch, construction lines left in",
    words: "rough graphite storyboard drawing, soft 4B pencil, visible construction lines and searching strokes left in, smudged shading, kneaded-eraser highlights, newsprint tone",
  },
];

export const GENRES = [
  {
    id: "neo-noir", label: "Neo-Noir Detective", kind: "genre",
    note: "Sodium streetlight, wet asphalt, hard shadow",
    words: "neo-noir cinematography, sodium streetlight and wet asphalt reflections, hard key from camera right with deep unlit shadow, 40mm anamorphic with horizontal flare, 1970s stock grain, desaturated but for amber practicals",
  },
  {
    id: "fighter-pilot", label: "Eighties Fighter Pilot", kind: "genre",
    note: "Hard sun, canopy glass, long lens",
    words: "1980s aviation film look, hard high-altitude sunlight, canopy glass reflections and lens veiling, 135mm long lens compression, warm Kodak stock with crushed cyan shadows, slight gate weave",
  },
  {
    id: "wuxia-rooftop", label: "Wuxia Rooftop", kind: "genre",
    note: "Moonlight, silk, wire-work stillness",
    words: "wuxia cinematography, cool moonlight with practical lantern warmth, silk catching rim light, 50mm at a low angle looking up past tiled eaves, drifting mist, poised stillness between movements",
  },
  {
    id: "found-footage", label: "Found Footage", kind: "genre",
    note: "Handheld, on-camera light, rolling shutter",
    words: "found-footage handheld video, single on-camera LED throwing a hard close falloff, wide 18mm with barrel distortion, rolling-shutter skew, autofocus hunting, blown highlights and noisy shadows",
  },
  {
    id: "spaghetti-western", label: "Spaghetti Western", kind: "genre",
    note: "Dust, extreme close, scorched palette",
    words: "spaghetti western cinematography, hard noon sun through hanging dust, scorched ochre and bleached sky palette, extreme close-up on 85mm cut against a very wide, deep focus, anamorphic squeeze",
  },
  {
    id: "heist", label: "The Heist", kind: "genre",
    note: "Cool fluorescents, clean geometry, long takes",
    words: "heist film cinematography, cool overhead fluorescents and green-tinged practicals, clean symmetrical geometry, 35mm on a dolly holding a long unbroken take, controlled contrast, muted steel palette",
  },
  {
    id: "space-opera", label: "Space Opera", kind: "genre",
    note: "Hard key, rim light, practical consoles",
    words: "space opera cinematography, single hard key with strong cyan rim separation, practical console light on faces, haze catching light shafts, 32mm with subtle lens breathing, deep blacks and saturated instrument color",
  },
  {
    id: "kitchen-sink", label: "Kitchen Sink Realism", kind: "genre",
    note: "Window light, natural color, unglamorous",
    words: "British kitchen-sink realism, available window light and bare ceiling bulbs, naturalistic unglamorous color, 28mm handheld at eye level, slightly underexposed, 16mm grain",
  },
  {
    id: "cyberpunk-street", label: "Cyberpunk Street", kind: "genre",
    note: "Neon, rain, signage bounce",
    words: "cyberpunk street cinematography, saturated neon signage bouncing off wet surfaces, magenta and cyan key from competing sources, persistent rain and steam, 24mm wide with heavy bokeh behind, crushed blacks",
  },
  {
    id: "period-romance", label: "Period Romance", kind: "genre",
    note: "Candle and window, soft falloff, warm",
    words: "period romance cinematography, candlelight and north-facing window light, very soft falloff, warm amber highlights against cool shadow, 58mm wide open with gentle swirl, fine grain, painterly composition",
  },
  {
    id: "submarine-thriller", label: "Submarine Thriller", kind: "genre",
    note: "Red alert light, close quarters, sweat",
    words: "submarine thriller cinematography, red alert lighting and hard instrument practicals, extremely close quarters with pipes crossing frame, 25mm close to faces, condensation and sweat, deep green-black shadow",
  },
  {
    id: "nature-documentary", label: "Nature Documentary", kind: "genre",
    note: "Long lens, golden hour, patient framing",
    words: "wildlife documentary cinematography, very long 600mm lens with compressed background, golden-hour backlight catching edges, patient locked-off framing, naturalistic color, shallow focus isolating the subject",
  },
];

export const STYLE_PRESETS = [...MEDIUMS, ...GENRES];

export function styleById(id) {
  return STYLE_PRESETS.find((s) => s.id === id) ?? null;
}

/*
  Names that may never appear in a preset, a preset's words, or anything a
  creator types that reaches the model.

  This is not a content filter and it is not trying to be clever. It is a
  short list of the specific things people ask for first, kept here so the
  refusal is one lookup rather than a judgment call at three in the morning.
  Studios, franchises and the living artists whose house styles get named.

  A match is a refusal with a reason, never a silent rewrite — a creator who
  asked for Ghibli and quietly received something else learns that the product
  ignores them.
*/
export const PROTECTED_TERMS = [
  "ghibli", "miyazaki", "pixar", "disney", "dreamworks", "marvel", "dc comics",
  "simpsons", "family guy", "south park", "rick and morty", "arcane", "spider-verse",
  "star wars", "star trek", "harry potter", "lord of the rings", "game of thrones",
  "top gun", "john wick", "james bond", "007", "jurassic park", "the matrix",
  "barbie", "nintendo", "pokemon", "sonic the hedgehog", "minecraft", "fortnite",
  "wes anderson", "tim burton", "quentin tarantino", "christopher nolan",
];

/**
 * Does this text name something nobody here is allowed to imitate?
 * Returns the term found, or null. Word-boundary matched so "dcs" and
 * "discord" do not trip "dc comics", and case-insensitive because nobody
 * types carefully.
 */
export function protectedTermIn(text) {
  const haystack = ` ${String(text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
  for (const term of PROTECTED_TERMS) {
    const needle = ` ${term.replace(/[^a-z0-9]+/g, " ")} `;
    if (haystack.includes(needle)) return term;
  }
  return null;
}
