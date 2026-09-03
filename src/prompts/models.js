// src/prompts/models.js
// Prompt directory data. Add a new model = add one object to MODELS.
// Every model added here is automatically routed, rendered, and indexed.

export const MODELS = [
  {
    slug: "seedance-2-5",
    name: "Seedance 2.5",
    maker: "ByteDance",
    title: "Seedance 2.5 Prompts — 30-Second Cinematic Takes",
    description:
      "Free copy-and-paste Seedance 2.5 prompts built for 30-second continuous takes and real physics. Director-grade cinematography, ready to run.",
    h1: "Seedance 2.5 Prompts: Director-Grade Single Takes, Built for 30 Seconds",
    strength: "30-second continuous takes and physical simulation",
    intro:
      "Seedance 2.5 is built for duration and continuity: single-take shots up to 30 seconds with stable spatial logic and convincing physical simulation. These prompts are written to exploit that — long developing camera moves, unbroken blocking, and material behavior that holds together across the full take. Copy any prompt, paste it into your generator, and adjust the specifics to your story.",
    prompts: [
      {
        title: "The Cartographer's Ascent",
        text: `A continuous 30-second single take following a lone cartographer climbing the exterior iron staircase of a colossal lighthouse at blue hour, storm clearing behind her. Camera begins in a low, wide anamorphic establishing shot at 35mm, then rises in one unbroken crane move alongside her ascent, maintaining her in the lower third as the horizon drops away. Wet iron treads throw specular highlights; her heavy oilskin coat sheds beading rainwater with accurate weight and drag as wind pulls it sideways. Practical lantern light warms her face against the cold cyan of the receding storm. Deep focus, natural motion blur, filmic grain, stable spatial continuity throughout, no cuts. Ambient sound of wind, distant surf, and ringing metal.`,
      },
      {
        title: "Kitchen at Service",
        text: `A continuous 30-second single take moving through a working restaurant kitchen at the peak of dinner service. Camera enters at chest height on a 28mm lens, gliding forward in one uninterrupted Steadicam move past the pass, around the flat-top, and out toward the dish pit, never cutting. Flame flares from a tossed pan and illuminates faces in bursts; steam rises with convincing volumetric density and dissipates naturally; water beads and runs down stainless steel. Cooks move with real weight and momentum, passing behind and in front of camera with correct occlusion. Warm tungsten overheads against cold daylight from a service window. Handheld micro-movement, shallow depth of field, ambient clatter and ticket-printer chatter.`,
      },
      {
        title: "The Long Walk Home",
        text: `A continuous 30-second single take tracking a teenage boy walking home along a rain-slick suburban street at dusk, camera dollying backward ahead of him at eye level on a 50mm lens the entire time. Puddles ripple accurately under each footfall and settle behind him. His backpack sways with correct mass and inertia; his breath fogs and drifts. Streetlights ignite one by one as he passes, each throwing a moving pool of sodium-orange light across his face and the wet asphalt. Background parked cars and hedges pass with stable parallax and consistent geometry. Chiaroscuro lighting, anamorphic flare on the streetlights, natural motion blur, no cuts, ambient suburban quiet and distant dogs.`,
      },
      {
        title: "Foundry, Third Shift",
        text: `A continuous 30-second single take inside a working iron foundry at night. Camera opens tight on molten metal pouring from a crucible, then pulls back and cranes upward in one unbroken move to reveal the full scale of the casting floor and the workers below. Molten iron flows with correct viscosity and surface tension, throwing sparks that arc and die with accurate ballistic physics. Heat shimmer distorts the air above the pour. Workers in heavy protective gear move deliberately, their shadows raking across the floor as the light source shifts. Extreme chiaroscuro — near-black shadow against searing orange — shot on 40mm, deep focus, heavy filmic grain, immersive industrial roar.`,
      },
      {
        title: "The Unbroken Corridor",
        text: `A continuous 30-second single take following a nurse pushing a gurney down a hospital corridor at 3am, camera trailing at hip height on a 24mm lens, gliding smoothly without a single cut. Overhead fluorescents pass rhythmically, each one sweeping light across the sheets and the nurse's face in a repeating pulse. The gurney's wheels carry real momentum through turns; the sheet ripples with correct fabric physics from the movement of air. Corridor geometry stays spatially consistent through two turns and a set of swinging doors that part and settle naturally. Cold, desaturated palette, hard top light, natural motion blur, ambient hum of fluorescent ballast and squeaking casters.`,
      },
    ],
  },

  {
    slug: "veo-3-1",
    name: "Veo 3.1",
    maker: "Google DeepMind",
    title: "Veo 3.1 Prompts — Dialogue, Lip Sync & Close-Ups",
    description:
      "Free Veo 3.1 prompts written for native audio, lip-synced dialogue, and high-fidelity facial texture. Copy, paste, and shoot. No account required.",
    h1: "Veo 3.1 Prompts: Lip-Synced Dialogue and Skin-Level Detail",
    strength: "native audio, lip-synced dialogue, and facial texture",
    intro:
      "Veo 3.1's advantage is the face and the voice: native audio generation, believable lip sync, and enough textural fidelity to hold a close-up. These prompts are written for performance — spoken lines, micro-expression, and lighting that rewards skin detail rather than hiding it. Dialogue is written inline so the model has something specific to synchronize to.",
    prompts: [
      {
        title: "The Confession Booth",
        text: `Extreme close-up on a woman in her sixties in a dimly lit confession booth, shot on an 85mm lens at shallow depth of field, only the lattice screen light falling across her face in narrow bars. Every pore, fine line, and the wet rim of her eyes is rendered in high fidelity. She speaks quietly, with a slight tremor, lips fully synchronized to the line: "I told him it was the last time. That was nineteen years ago." Her jaw tightens after the final word. Warm single-source practical from above, heavy chiaroscuro, deep shadow filling the frame. Faint sound of a church organ two rooms away and her own unsteady breath.`,
      },
      {
        title: "Two-Hander at the Diner",
        text: `A medium two-shot across a diner booth at 3am, 40mm lens, shallow focus favoring the man on the left. He is tired, unshaven, the fluorescent overhead catching the sweat at his hairline with realistic skin sheen. He says, evenly, lips precisely synced: "You knew before I did. Just say it." The woman opposite does not answer immediately; her eyes move first, then her mouth opens slightly and closes. Cold fluorescent key mixed with warm neon spill from the window. Faint hum of a refrigeration unit, the clink of a spoon somewhere off-frame, no music. Naturalistic performance, micro-expression detail on both faces.`,
      },
      {
        title: "The Broadcast",
        text: `A tight close-up of a young radio broadcaster in a soundproofed booth, lit by the amber glow of the console below her, 100mm lens, extremely shallow depth of field with only her eyes in critical focus. Skin texture, the fine hairs at her temple, and the condensation of breath on the microphone windscreen are all rendered at high fidelity. She leans in and speaks with practiced warmth, fully lip-synced: "If you're still awake out there — this one is for you." Her expression shifts from performance to something genuine on the last three words. Low-key amber and deep blue palette, soft top light, natural film grain, the ambient hush of an isolated booth.`,
      },
      {
        title: "Doorway Goodbye",
        text: `A medium close-up of a man in his thirties standing in a doorway at dusk, half in warm interior lamplight and half in cool blue exterior shadow, 50mm lens. Rain falls behind him, out of focus. His face carries visible fatigue — reddened eyes, stubble, a small healing cut on the eyebrow, all rendered with high textural fidelity. He speaks with difficulty, lips fully synchronized: "I'm not asking you to wait. I'm asking you to remember." He swallows after the line and looks down. Naturalistic performance, split lighting, shallow focus, ambient rain and distant traffic, no score.`,
      },
      {
        title: "The Deposition",
        text: `A locked-off medium shot of an elderly man seated at a bare table in a fluorescent-lit deposition room, 35mm lens, flat frontal lighting that deliberately reveals every crease, liver spot, and tremor in his hands. He waits, breathing audibly, then answers with quiet defiance, lips precisely synced: "I signed it. I read every word before I did." A slight tightening at the corner of his mouth follows. The unforgiving overhead light and pale institutional walls remove all flattery from the image. High-fidelity facial texture, subtle involuntary micro-movements, ambient air-conditioning drone and the tap of a stenographer's keys.`,
      },
    ],
  },

  {
    slug: "kling-3",
    name: "Kling 3.0",
    maker: "Kuaishou",
    title: "Kling 3.0 Prompts — Action, Motion & Crowd Shots",
    description:
      "Free Kling 3.0 prompts engineered for kinetic action, physical performance, and dense crowds. Director-grade and copy-ready. No account required.",
    h1: "Kling 3.0 Prompts: Kinetic Action, Real Bodies, Dense Crowds",
    strength: "fast kinetic action, physical performance, and dense crowds",
    intro:
      "Kling 3.0 is strongest where things move: fast camera work, full-body physical performance, and crowds that behave like crowds. These prompts are built around velocity and mass — chases, fights, and scenes with real human density — with camera language written to keep up rather than sit still.",
    prompts: [
      {
        title: "Night Market Pursuit",
        text: `A fast handheld tracking shot chasing a young courier sprinting through a dense night market, camera at shoulder height on a 24mm lens, weaving between stalls and bodies at full running speed. Hundreds of shoppers fill the frame with individual, non-repeating behavior — turning heads, stepping aside, colliding, recoiling — while hanging bulbs and neon signage streak past. The courier vaults a produce crate with correct body mechanics and lands with visible impact absorption through the knees. Steam from food stalls bursts across the lens. Saturated reds and greens against wet pavement, heavy motion blur, whip-pan on the final turn, roaring ambient crowd noise.`,
      },
      {
        title: "The Staircase Fight",
        text: `A continuous kinetic tracking shot of a brutal hand-to-hand fight descending a narrow concrete stairwell, camera tight at 18mm, moving with the combatants and absorbing their impacts. Two fighters exchange grappling strikes with full-body weight transfer — shoulders driving, feet resetting, bodies slamming into railings that shudder on impact. Dust falls from the ceiling with each collision. One fighter is thrown down half a flight and lands hard with realistic momentum and recovery. Bare bulbs swing violently from the impacts, throwing wildly moving shadows. Desaturated concrete palette, harsh raking light, aggressive handheld motion, visceral impact sound design.`,
      },
      {
        title: "Break at the Whistle",
        text: `A sweeping crane shot rising above a packed stadium terrace the instant a goal is scored, 35mm lens, camera lifting and pushing forward over a crowd of thousands. Individual spectators react with distinct, non-uniform motion — arms thrown up at different moments, some leaping, some frozen, scarves and flags whipping upward in a chaotic wave. Confetti and paper streamers launch with accurate ballistic arcs and drift. Floodlights flare across the lens as the camera rises into their beam. Cold stadium white light against the color mass of the crowd, deep depth of field to hold the full scale, thunderous ambient roar.`,
      },
      {
        title: "Rooftop Escape",
        text: `An aggressive continuous chase shot following two figures sprinting across a Hong Kong rooftop at dusk, camera flying behind them at 21mm, matching their pace and vaulting the gaps they clear. Laundry lines and antenna arrays whip past the lens. The lead runner leaps a two-meter gap between buildings — full-body extension, arms driving, landing with a genuine roll and a scrabbling recovery on gravel that scatters underfoot. Air-conditioning units shudder as they push off them. Golden low sun rakes across the rooftops, long hard shadows, dust and grit kicked into the light. Handheld urgency, natural motion blur, wind and breath in the audio.`,
      },
      {
        title: "The Charge",
        text: `A low-angle tracking shot at knee height moving backward ahead of a mass of protestors surging forward down a wide avenue, 28mm lens, camera retreating at pace to stay just in front of the front rank. Hundreds of individuals fill the depth of the frame with distinct gaits, gestures, and collisions — banners lurching, one figure stumbling and being pulled upright by another. Tear gas canisters trail smoke that billows and shears across the crowd with convincing fluid dynamics. Overturned barricades scrape and shift under the press of bodies. Overcast flat daylight, desaturated palette, hard handheld shake, overwhelming ambient shouting and footfall.`,
      },
    ],
  },
];

export function getModel(slug) {
  return MODELS.find((m) => m.slug === slug) ?? null;
}