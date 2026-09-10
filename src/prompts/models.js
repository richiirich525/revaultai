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
        genre: "Cinematic Realism",
        text: `A continuous 30-second single take following a lone cartographer climbing the exterior iron staircase of a colossal lighthouse at blue hour, storm clearing behind her. Camera begins in a low, wide anamorphic establishing shot at 35mm, then rises in one unbroken crane move alongside her ascent, maintaining her in the lower third as the horizon drops away. Wet iron treads throw specular highlights; her heavy oilskin coat sheds beading rainwater with accurate weight and drag as wind pulls it sideways. Practical lantern light warms her face against the cold cyan of the receding storm. Deep focus, natural motion blur, filmic grain, stable spatial continuity throughout, no cuts. Ambient sound of wind, distant surf, and ringing metal.`,
      },
      {
        title: "Kitchen at Service",
        genre: "Cinematic Realism",
        text: `A continuous 30-second single take moving through a working restaurant kitchen at the peak of dinner service. Camera enters at chest height on a 28mm lens, gliding forward in one uninterrupted Steadicam move past the pass, around the flat-top, and out toward the dish pit, never cutting. Flame flares from a tossed pan and illuminates faces in bursts; steam rises with convincing volumetric density and dissipates naturally; water beads and runs down stainless steel. Cooks move with real weight and momentum, passing behind and in front of camera with correct occlusion. Warm tungsten overheads against cold daylight from a service window. Handheld micro-movement, shallow depth of field, ambient clatter and ticket-printer chatter.`,
      },
      {
        title: "The Long Walk Home",
        genre: "Drama",
        text: `A continuous 30-second single take tracking a teenage boy walking home along a rain-slick suburban street at dusk, camera dollying backward ahead of him at eye level on a 50mm lens the entire time. Puddles ripple accurately under each footfall and settle behind him. His backpack sways with correct mass and inertia; his breath fogs and drifts. Streetlights ignite one by one as he passes, each throwing a moving pool of sodium-orange light across his face and the wet asphalt. Background parked cars and hedges pass with stable parallax and consistent geometry. Chiaroscuro lighting, anamorphic flare on the streetlights, natural motion blur, no cuts, ambient suburban quiet and distant dogs.`,
      },
      {
        title: "Foundry, Third Shift",
        genre: "Cinematic Realism",
        text: `A continuous 30-second single take inside a working iron foundry at night. Camera opens tight on molten metal pouring from a crucible, then pulls back and cranes upward in one unbroken move to reveal the full scale of the casting floor and the workers below. Molten iron flows with correct viscosity and surface tension, throwing sparks that arc and die with accurate ballistic physics. Heat shimmer distorts the air above the pour. Workers in heavy protective gear move deliberately, their shadows raking across the floor as the light source shifts. Extreme chiaroscuro — near-black shadow against searing orange — shot on 40mm, deep focus, heavy filmic grain, immersive industrial roar.`,
      },
      {
        title: "The Unbroken Corridor",
        genre: "Drama",
        text: `A continuous 30-second single take following a nurse pushing a gurney down a hospital corridor at 3am, camera trailing at hip height on a 24mm lens, gliding smoothly without a single cut. Overhead fluorescents pass rhythmically, each one sweeping light across the sheets and the nurse's face in a repeating pulse. The gurney's wheels carry real momentum through turns; the sheet ripples with correct fabric physics from the movement of air. Corridor geometry stays spatially consistent through two turns and a set of swinging doors that part and settle naturally. Cold, desaturated palette, hard top light, natural motion blur, ambient hum of fluorescent ballast and squeaking casters.`,
      },
      {
        title: "Rain Never Stops in Sector Nine",
        genre: "Cyberpunk Noir",
        text: `A continuous 30-second single take following a trench-coated detective walking the length of a flooded neon arcade in a rain-drowned megacity, camera dollying backward ahead of him at chest height on a 35mm anamorphic lens, never cutting. Standing water displaces around each footfall with correct fluid behavior and settles behind him. Holographic advertisements reflect and fracture across the moving surface of the water, their light shifting continuously over his face as he passes beneath each one. His sodden coat carries real weight, dragging with a half-second lag behind his movement. Deep chiaroscuro, magenta and electric cyan against near-black, volumetric rain, anamorphic streak flares, natural motion blur, stable spatial continuity, ambient downpour and distant transit hum.`,
      },
      {
        title: "The Siege Ladder",
        genre: "Epic Fantasy",
        text: `A continuous 30-second single take rising alongside a scaling ladder as armored soldiers climb the outer wall of a besieged medieval fortress at dawn. Camera begins low among churned mud and shields, then cranes upward in one unbroken move, tracking the climbers rung by rung to the battlements above. The ladder flexes and shudders under distributed weight with convincing structural physics. Arrows strike the timber and stone with correct impact and deflection; chainmail carries real mass, shifting and ringing against itself with each pull upward. Pitch smoke drifts through cold dawn light. Desaturated steel and mud palette, hard low sun, deep focus, heavy filmic grain, roaring battle ambience.`,
      },
      {
        title: "The Dissolving Room",
        genre: "Surreal",
        text: `A continuous 30-second single take inside a windowless white room where the architecture slowly dissolves into falling sand. Camera moves in one unbroken slow orbit around a wooden chair at the center, 40mm lens, maintaining consistent spatial geometry as the walls disintegrate grain by grain. Sand falls with accurate granular physics, pooling and slumping into drifts across the floor, sliding as the piles exceed their angle of repose. The chair remains untouched and perfectly solid. A single hard light source from above narrows steadily, deepening the shadows across the growing dunes. Stark high-contrast lighting, monochrome bone-white and shadow, no cuts, subtle sound of pouring grain and settling weight.`,
      },
      {
        title: "Basement Tape, 03:14",
        genre: "Found Footage Horror",
        text: `A continuous 30-second single take from a handheld camcorder descending a wooden basement staircase, camera bobbing with the operator's footsteps at 24mm, harsh onboard light throwing a single hard cone into the dark. Dust hangs and swirls through the beam with convincing volumetric behavior; the stairs flex and creak under real weight. At the bottom the light sweeps across a concrete floor, a floor drain, and a door standing slightly open that was not open before. The camera hesitates, breath audible, then pushes forward. Overexposed hotspot at the center of the beam falling to total black at the edges, heavy digital noise, timecode burn, no cuts, only footsteps and breathing.`,
      },
      {
        title: "Ascension of the Drowned Cathedral",
        genre: "Surreal",
        text: `A continuous 30-second single take rising through the flooded nave of a colossal gothic cathedral, camera beginning submerged among broken pews and lifting in one unbroken vertical move up through the water's surface and into the vaulted air above, 28mm lens, no cuts. The surface breaks with accurate fluid dynamics, sheeting off the lens and settling into ripples that continue to propagate outward. Shafts of pale light fall through shattered stained glass, refracting differently above and below the waterline. Suspended particulate drifts with correct buoyancy. Cold blue-green underwater tones giving way to warm dust-filled gold above, deep focus, immersive filmic grain, muffled underwater sound resolving into cathedral reverb.`,
      },
       {
        title: "The Long Descent",
        genre: "Continuity",
        text: `A continuous 30-second single take following Maya Torres descending the exterior fire escape of a rain-soaked tenement at blue hour. Maya Torres is a woman in her early thirties, angular face, deep brown skin, short natural black curls, small scar through the left eyebrow, athletic build, wearing a charcoal canvas field jacket with four front pockets over a faded burgundy crew-neck shirt, black utility pants and brown leather boots. Camera begins in a low wide anamorphic framing at 35mm and descends alongside her in one unbroken vertical move, holding her in the left third of frame throughout. Rainwater sheets off the charcoal canvas of her jacket with accurate weight and runoff, beading at the collar and shedding from the hem; the fabric carries visible sodden mass and lags behind her movement. Wet iron treads throw hard specular highlights under a single sodium streetlamp camera-left, unchanged for the length of the take. Deep focus, natural motion blur, filmic grain, no cuts, ambient downpour and ringing metal.`,
        note: `The full character block — face, hair, scar, and every garment — is written as one contiguous string that can be reproduced verbatim in the next shot without re-composition. The light is anchored to a single named source in a fixed position ("one sodium streetlamp camera-left, unchanged"), so an audit reading the next shot can verify the key direction hasn't silently moved.`,
      },
      {
        title: "Workshop, Unbroken",
        genre: "Continuity",
        text: `A continuous 30-second single take inside Halvorsen's boat workshop, a long timber-framed room with sawdust-covered plank floors, hulls in frame along the left wall, one high north-facing window camera-right and a row of caged bulbs overhead. Elias Halvorsen is a man in his sixties, weathered pale skin, deep vertical creases at the mouth, close-cropped grey hair, heavy build, wearing a faded blue cotton work shirt with the sleeves rolled above the elbow, a stained canvas apron and steel-toed boots. Camera enters at chest height on a 28mm lens and glides forward in one uninterrupted Steadicam move down the length of the hull as he planes a strake. Curled shavings lift and fall with correct mass, settling into the sawdust; airborne dust drifts through the north window light with convincing volumetric density. Cool daylight from camera-right against the warm tungsten of the caged bulbs, both sources constant. Shallow depth of field, handheld micro-movement, no cuts.`,
        note: `Character and location are each written as a single self-contained block, so the same two strings can be dropped into every shot of the sequence without paraphrase. Both light sources are named with a fixed direction and declared constant, which gives a continuity audit an explicit anchor to check subsequent shots against rather than inferring intent.`,
      },
      {
        title: "The Ward at Four",
        genre: "Continuity",
        text: `A continuous 30-second single take following Sister Adaeze Okonjo down the east corridor of St. Brendan's ward at 4am — a narrow corridor of pale green tiled walls, a scuffed grey linoleum floor and evenly spaced overhead fluorescent panels, one panel flickering near the far doors. Adaeze Okonjo is a woman in her forties, dark brown skin, high cheekbones, hair braided close to the scalp and gathered at the nape, slim build, wearing pale blue scrubs, a navy cardigan with the left cuff pushed up over a plain steel watch and white leather clogs. Camera trails at hip height on a 24mm lens, gliding smoothly without a single cut as she pushes a gurney. The overhead panels pass in a repeating rhythm, sweeping cold top light across her face and the sheets; the flickering panel intermittently breaks that rhythm. The gurney carries real momentum through a right turn, the sheet rippling with correct fabric physics from displaced air. Cold desaturated palette, natural motion blur, fluorescent ballast hum and squeaking casters.`,
        note: `Every mutable detail a supervisor would catch is pinned in the string itself: which cuff is pushed up, which panel flickers, which direction the corridor turns. Wardrobe is enumerated garment by garment rather than summarised as "scrubs", so a later shot that changes the cardigan or drops the watch reads as a flagged discrepancy instead of ambiguity.`,
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
        genre: "Drama",
        text: `Extreme close-up on a woman in her sixties in a dimly lit confession booth, shot on an 85mm lens at shallow depth of field, only the lattice screen light falling across her face in narrow bars. Every pore, fine line, and the wet rim of her eyes is rendered in high fidelity. She speaks quietly, with a slight tremor, lips fully synchronized to the line: "I told him it was the last time. That was nineteen years ago." Her jaw tightens after the final word. Warm single-source practical from above, heavy chiaroscuro, deep shadow filling the frame. Faint sound of a church organ two rooms away and her own unsteady breath.`,
      },
      {
        title: "Two-Hander at the Diner",
        genre: "Drama",
        text: `A medium two-shot across a diner booth at 3am, 40mm lens, shallow focus favoring the man on the left. He is tired, unshaven, the fluorescent overhead catching the sweat at his hairline with realistic skin sheen. He says, evenly, lips precisely synced: "You knew before I did. Just say it." The woman opposite does not answer immediately; her eyes move first, then her mouth opens slightly and closes. Cold fluorescent key mixed with warm neon spill from the window. Faint hum of a refrigeration unit, the clink of a spoon somewhere off-frame, no music. Naturalistic performance, micro-expression detail on both faces.`,
      },
      {
        title: "The Broadcast",
        genre: "Drama",
        text: `A tight close-up of a young radio broadcaster in a soundproofed booth, lit by the amber glow of the console below her, 100mm lens, extremely shallow depth of field with only her eyes in critical focus. Skin texture, the fine hairs at her temple, and the condensation of breath on the microphone windscreen are all rendered at high fidelity. She leans in and speaks with practiced warmth, fully lip-synced: "If you're still awake out there — this one is for you." Her expression shifts from performance to something genuine on the last three words. Low-key amber and deep blue palette, soft top light, natural film grain, the ambient hush of an isolated booth.`,
      },
      {
        title: "Doorway Goodbye",
        genre: "Drama",
        text: `A medium close-up of a man in his thirties standing in a doorway at dusk, half in warm interior lamplight and half in cool blue exterior shadow, 50mm lens. Rain falls behind him, out of focus. His face carries visible fatigue — reddened eyes, stubble, a small healing cut on the eyebrow, all rendered with high textural fidelity. He speaks with difficulty, lips fully synchronized: "I'm not asking you to wait. I'm asking you to remember." He swallows after the line and looks down. Naturalistic performance, split lighting, shallow focus, ambient rain and distant traffic, no score.`,
      },
      {
        title: "The Deposition",
        genre: "Drama",
        text: `A locked-off medium shot of an elderly man seated at a bare table in a fluorescent-lit deposition room, 35mm lens, flat frontal lighting that deliberately reveals every crease, liver spot, and tremor in his hands. He waits, breathing audibly, then answers with quiet defiance, lips precisely synced: "I signed it. I read every word before I did." A slight tightening at the corner of his mouth follows. The unforgiving overhead light and pale institutional walls remove all flattery from the image. High-fidelity facial texture, subtle involuntary micro-movements, ambient air-conditioning drone and the tap of a stenographer's keys.`,
      },
      {
        title: "The Informant's Terms",
        genre: "Cyberpunk Noir",
        text: `A tight close-up of a woman in her forties seated in a rain-streaked car at night, face lit only by the shifting magenta and cyan of a holographic billboard outside, 85mm lens, extremely shallow depth of field. Rain shadows crawl across her skin; every pore, the smudged liner beneath one eye, and the faint scar along her jaw render at high fidelity. She speaks low and fast, lips fully synchronized: "You get the file, I get a new name, and neither of us was ever here." Her eyes flick once to the mirror on the final word. Neon-noir palette, hard side key, deep black fill, ambient rain on the roof and the low idle of the engine.`,
      },
      {
        title: "Oath at the War Table",
        genre: "Epic Fantasy",
        text: `A slow push-in from medium to close-up on a grey-bearded warlord standing over a candlelit war table in a stone hall, 50mm lens. Firelight flickers across weathered skin, rendering deep creases, wind-burn, and the wet shine of tired eyes at high fidelity. He looks up and speaks with weary authority, lips precisely synced: "We hold the bridge until sundown. After that, it will not matter who holds it." A muscle works in his jaw after the line. Warm single-source candlelight against cold stone, heavy chiaroscuro, shallow focus, ambient crackle of flame, distant rain, and the shift of armor off-frame.`,
      },
      {
        title: "The Interview That Never Happened",
        genre: "Surreal",
        text: `A locked-off medium close-up of a man in his fifties seated against a blank grey wall, flat frontal lighting, 40mm lens. The image is rendered with unforgiving textural fidelity — sweat at the temple, a nervous swallow, the slight asymmetry of a forced smile. He begins confidently, lips fully synced: "There was never any building on that site. I would remember." Mid-sentence his own reflection in the dark glass behind him fails to move with him. His expression does not change; he keeps talking. Clinical documentary lighting, no score, the faint hiss of a recording device and room tone. Naturalistic performance, subtle involuntary micro-movements.`,
      },
      {
        title: "The Cartographer of Nothing",
        genre: "Surreal",
        text: `An extreme close-up of a woman's face floating in a featureless white void, 100mm lens, lit by an impossible soft light with no visible source and no cast shadow. Skin texture, fine hairs, and the moisture line of the lower lid are rendered at extreme fidelity against the total emptiness behind her. She speaks slowly, as if remembering the words rather than choosing them, lips fully synchronized: "I drew the map before there was any country. That was the mistake." Her pupils dilate slightly on the final word. Flat shadowless illumination, monochrome bone-white palette, no ambient sound at all except her voice and a single sustained low tone.`,
      },
      {
        title: "Camera Two, Last Entry",
        genre: "Found Footage Horror",
        text: `A handheld close-up of a young man holding a camcorder at arm's length in a dark stairwell, his face lit hard and unevenly from below by the camera's onboard light, 24mm lens with visible barrel distortion. The harsh underlighting reveals every detail — dilated pupils, sweat, a split lip, the tremor in his breathing. He whispers directly into the lens, lips precisely synced: "If anyone finds this, don't come looking. Just don't come looking." He glances off-frame, then kills the light. Overexposed hotspot falling to crushed black, heavy digital noise, timecode overlay, only breath and distant structural creaking in the audio.`,
      },
     {
        title: "The Statement, Take One",
        genre: "Continuity",
        text: `A locked-off medium close-up of Elena Márquez seated at a bare steel table in a windowless interview room with pale institutional walls and a single overhead fluorescent panel directly above her, 40mm lens. Elena Márquez is a woman in her fifties, olive skin, deep nasolabial lines, greying black hair pulled into a low knot with two loose strands at the right temple, a small mole beneath the left eye, wearing a charcoal wool blazer over a white cotton shirt buttoned to the collar and a thin gold chain. The unforgiving overhead light reveals every crease, the shine at her temple and the fine tremor in her hands, rendered at high textural fidelity. She waits, breathing audibly, then answers with quiet defiance, lips precisely synchronised: "I signed it. I read every word before I did." A slight tightening at the corner of her mouth follows. Ambient air-conditioning drone and the tap of a stenographer's keys, no score.`,
        note: `The spoken line is written out in full so a reverse or reaction shot can carry the identical dialogue text without drift, and the two loose strands at the right temple give an audit a specific, checkable detail rather than a general impression of hairstyle. Light is declared as a single named fixture in a fixed position, so any subsequent shot lit from a different angle in the same room registers as unmotivated.`,
      },
      {
        title: "Across the Booth",
        genre: "Continuity",
        text: `A medium two-shot across a diner booth at 3am, 40mm lens, shallow focus favouring the man camera-left. Daniel Ruiz is a man in his late thirties, tan skin, three-day stubble, dark hair pushed back and slightly damp at the hairline, a healing split on the lower lip, wearing an olive canvas jacket over a grey t-shirt and a plain leather watch strap on the left wrist. Opposite him, Claire Bennett is a woman in her late thirties, fair freckled skin, auburn hair cut to the jaw and tucked behind the right ear, wearing a rust-coloured wool coat over a black turtleneck. Cold fluorescent overhead mixed with warm red neon spilling through the window camera-right, both constant. Daniel says, evenly, lips precisely synchronised: "You knew before I did. Just say it." Claire does not answer immediately; her eyes move first, then her mouth opens slightly and closes. Refrigeration hum, a spoon against ceramic off-frame, no music.`,
        note: `Two characters are described in separate contiguous blocks with explicit screen positions, so the reverse angle can reuse both strings unchanged while only the framing description differs. Asymmetric details — hair tucked behind the right ear, watch on the left wrist — are stated by side, which is the specific failure mode that flips between shots when a description is loose.`,
      },
      {
        title: "Last Broadcast",
        genre: "Continuity",
        text: `A tight close-up of Rosalind Achebe in a soundproofed radio booth, lit only by the amber glow of the console below her camera-left, 100mm lens, extremely shallow depth of field with only her eyes in critical focus. Rosalind Achebe is a woman in her late twenties, dark brown skin, close-cropped natural hair, a small silver stud in the right nostril, wearing black wire-framed headphones, a heather-grey sweatshirt with the collar cut away and no jewellery at the neck. Skin texture, the fine hairs at her temple and the condensation of her breath on the microphone windscreen are rendered at high fidelity. She leans in and speaks with practised warmth, fully lip-synchronised: "If you're still awake out there — this one is for you." Her expression shifts from performance to something genuine across the final three words. Low-key amber against deep blue shadow, soft top fill, natural film grain, the ambient hush of an isolated booth.`,
        note: `The negative detail — "no jewellery at the neck" — is as load-bearing as the positive ones, because a later shot that adds a necklace is the kind of drift an audit can only flag if absence was stated. Light is anchored to a practical source with a named direction, so the amber key remains verifiable across the sequence rather than being re-invented per shot.`,
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
        genre: "Action",
        text: `A fast handheld tracking shot chasing a young courier sprinting through a dense night market, camera at shoulder height on a 24mm lens, weaving between stalls and bodies at full running speed. Hundreds of shoppers fill the frame with individual, non-repeating behavior — turning heads, stepping aside, colliding, recoiling — while hanging bulbs and neon signage streak past. The courier vaults a produce crate with correct body mechanics and lands with visible impact absorption through the knees. Steam from food stalls bursts across the lens. Saturated reds and greens against wet pavement, heavy motion blur, whip-pan on the final turn, roaring ambient crowd noise.`,
      },
      {
        title: "The Staircase Fight",
        genre: "Action",
        text: `A continuous kinetic tracking shot of a brutal hand-to-hand fight descending a narrow concrete stairwell, camera tight at 18mm, moving with the combatants and absorbing their impacts. Two fighters exchange grappling strikes with full-body weight transfer — shoulders driving, feet resetting, bodies slamming into railings that shudder on impact. Dust falls from the ceiling with each collision. One fighter is thrown down half a flight and lands hard with realistic momentum and recovery. Bare bulbs swing violently from the impacts, throwing wildly moving shadows. Desaturated concrete palette, harsh raking light, aggressive handheld motion, visceral impact sound design.`,
      },
      {
        title: "Break at the Whistle",
        genre: "Action",
        text: `A sweeping crane shot rising above a packed stadium terrace the instant a goal is scored, 35mm lens, camera lifting and pushing forward over a crowd of thousands. Individual spectators react with distinct, non-uniform motion — arms thrown up at different moments, some leaping, some frozen, scarves and flags whipping upward in a chaotic wave. Confetti and paper streamers launch with accurate ballistic arcs and drift. Floodlights flare across the lens as the camera rises into their beam. Cold stadium white light against the color mass of the crowd, deep depth of field to hold the full scale, thunderous ambient roar.`,
      },
      {
        title: "Rooftop Escape",
        genre: "Action",
        text: `An aggressive continuous chase shot following two figures sprinting across a Hong Kong rooftop at dusk, camera flying behind them at 21mm, matching their pace and vaulting the gaps they clear. Laundry lines and antenna arrays whip past the lens. The lead runner leaps a two-meter gap between buildings — full-body extension, arms driving, landing with a genuine roll and a scrabbling recovery on gravel that scatters underfoot. Air-conditioning units shudder as they push off them. Golden low sun rakes across the rooftops, long hard shadows, dust and grit kicked into the light. Handheld urgency, natural motion blur, wind and breath in the audio.`,
      },
      {
        title: "The Charge",
        genre: "Action",
        text: `A low-angle tracking shot at knee height moving backward ahead of a mass of protestors surging forward down a wide avenue, 28mm lens, camera retreating at pace to stay just in front of the front rank. Hundreds of individuals fill the depth of the frame with distinct gaits, gestures, and collisions — banners lurching, one figure stumbling and being pulled upright by another. Tear gas canisters trail smoke that billows and shears across the crowd with convincing fluid dynamics. Overturned barricades scrape and shift under the press of bodies. Overcast flat daylight, desaturated palette, hard handheld shake, overwhelming ambient shouting and footfall.`,
      },
      {
        title: "Wet Street, Full Sprint",
        genre: "Cyberpunk Noir",
        text: `An aggressive handheld chase shot following a courier sprinting through a rain-flooded neon canyon at street level, camera at 21mm running behind and slightly below, matching pace and taking impacts. Dense crowds of pedestrians under transparent umbrellas react individually — turning, recoiling, breaking apart around the runner with distinct non-repeating motion. He slides across the hood of a stopped hovercar with genuine body mechanics and recovers into a full stride. Spray fans from every footfall. Saturated magenta and cyan reflections churning across black water, heavy motion blur, whip-pan at the corner, roaring rain and crowd audio.`,
      },
      {
        title: "The Line Breaks",
        genre: "Epic Fantasy",
        text: `A low-angle tracking shot at knee height retreating ahead of a medieval shield wall collapsing under cavalry impact, 28mm lens, camera moving fast to stay just ahead of the crush. Hundreds of armored infantry fill the frame in depth with distinct individual motion — bracing, stumbling, being driven backward, shields splintering. Horses collide with the line with full mass and momentum, riders pitching forward with realistic body physics. Mud sprays and clods arc through the air with accurate ballistics. Overcast flat daylight, desaturated steel and earth palette, violent handheld shake, deep depth of field to hold the scale, overwhelming ambient roar and impact.`,
      },
      {
        title: "Gravity Is a Suggestion",
        genre: "Surreal",
        text: `A continuous kinetic shot following a dancer falling upward through a rotating corridor whose orientation shifts every few seconds, camera tumbling with her at 18mm, maintaining her centered as the world revolves around them both. Her body moves with full athletic commitment — extension, contraction, controlled landings against surfaces that become floors the instant she touches them. Loose fabric and scattered paper move with correct physics relative to each shifting gravity vector. Hard directional light rotates with the architecture, sweeping across her at speed. Saturated primary color blocking against white void, aggressive camera motion, motion blur, percussive sound design synced to each impact.`,
      },
      {
        title: "Run the Corridor",
        genre: "Found Footage Horror",
        text: `A frantic handheld camcorder shot sprinting down a long institutional corridor, camera swinging wildly at 24mm as the operator runs, onboard light strobing across peeling walls and doorframes. Three other figures run ahead, their gaits distinct and panicked, one glancing back mid-stride with full-body torsion. A door is shoulder-charged open with real force and rebounds off the wall. Loose debris scatters and skitters underfoot with accurate physics. Overexposed hotspot with crushed black edges, severe motion blur, digital noise, timecode overlay, audio of pounding footfalls, ragged breathing, and something heavy keeping pace behind.`,
      },
      {
        title: "Market Riot",
        genre: "Action",
        text: `A fast crane-down into a market square as a crowd of hundreds turns from commerce to panic in a single continuous movement, 35mm lens, camera descending from high wide into the thick of the crowd at head height. Individuals react at staggered intervals with entirely distinct behavior — some running, some frozen, some pushing against the flow. Market stalls collapse under the press with correct structural failure, produce scattering and rolling with accurate physics. Fabric awnings tear and whip. Hard midday sun, high contrast, dust kicked into the light beams, handheld chaos once the camera lands, deafening layered crowd audio.`,
      },
    {
        title: "Through the Cordon",
        genre: "Continuity",
        text: `An aggressive handheld tracking shot at shoulder height on a 24mm lens, chasing Tomás Ferreira as he sprints through a police cordon into a packed night market. Tomás Ferreira is a man in his mid-twenties, brown skin, shaved head, a thin silver hoop in the left ear, wiry build, wearing a black nylon courier jacket with a reflective stripe across the back, grey cargo shorts and a canvas satchel worn across the body from right shoulder to left hip. Hundreds of shoppers fill the frame with individual, non-repeating behaviour — turning, stepping aside, colliding, recoiling — under strings of bare bulbs and hanging neon signage. He vaults a produce crate with correct body mechanics, the satchel swinging out and back with accurate mass and returning to the same crossed position on landing. Steam bursts across the lens from a food stall camera-left. Saturated reds and greens over wet pavement, heavy motion blur, roaring crowd audio.`,
        note: `The satchel is described with an explicit orientation and stated to return to that position after the vault, which stops a following shot from flipping the strap to the other shoulder without it reading as an error. Because crowd behaviour is specified as non-repeating rather than as a fixed arrangement, an audit won't flag the changing background as drift while still holding the foreground character to the letter.`,
      },
      {
        title: "The Stairwell",
        genre: "Continuity",
        text: `A continuous kinetic tracking shot of a hand-to-hand fight descending a narrow concrete stairwell, camera tight at 18mm, moving with the combatants and absorbing their impacts. Ivo Karadžić is a man in his forties, pale skin, broken nose set slightly to the left, close-cropped dark hair going grey at the temples, heavy build, wearing a torn white undershirt and dark work trousers with a split at the right knee. He grapples with a second fighter in a black bomber jacket. Weight transfers fully through the shoulders and hips, feet resetting between strikes; bodies slam into a steel railing that shudders on impact and dust falls from the ceiling with each collision. Ivo is thrown down half a flight and lands hard with realistic momentum and recovery, the split at the right knee widening. Bare bulbs swing violently from the impacts, throwing wildly moving shadows. Desaturated concrete palette, harsh raking light, aggressive handheld motion.`,
        note: `Damage is written as a progression — the split at the right knee exists before the fall and widens because of it — which gives an audit a causal chain rather than an unexplained change of wardrobe between shots. The broken nose is specified as set to the left, so a reverse angle that mirrors the character's face is caught rather than passing as a lighting difference.`,
      },
      {
        title: "The Avenue",
        genre: "Continuity",
        text: `A low-angle tracking shot at knee height on a 28mm lens, retreating ahead of a mass of protestors surging down a wide avenue at midday. At the front rank is Nadia Belkacem, a woman in her thirties, light brown skin, dark hair tied back with a red bandana knotted at the nape, wearing a faded army-green jacket with a torn left sleeve over a white shirt and carrying a folded cardboard placard in her right hand. Hundreds of individuals fill the depth of the frame with distinct gaits, gestures and collisions; one figure stumbles and is pulled upright by another. Tear gas canisters trail smoke that billows and shears across the crowd with convincing fluid dynamics. Overturned barricades scrape and shift under the press of bodies. Overcast flat daylight, no direct sun, desaturated palette, hard handheld shake, overwhelming ambient shouting and footfall.`,
        note: `The placard is pinned to a specific hand and the sleeve tear to a specific side, which are exactly the details that migrate across shots when a description says only "carrying a sign" or "torn jacket". Declaring the light as overcast with no direct sun sets a soft, directionless key that a later shot cannot contradict with hard shadows without the audit catching it.`,
      },  
    ],
  },
];

export function getModel(slug) {
  return MODELS.find((m) => m.slug === slug) ?? null;
}

// Every genre present, in display order. Used for the filter chips.
export const GENRES = [
  "Cinematic Realism",
  "Drama",
  "Action",
  "Cyberpunk Noir",
  "Epic Fantasy",
  "Surreal",
  "Found Footage Horror",
];

export function genresFor(model) {
  const seen = new Set((model?.prompts ?? []).map((p) => p.genre));
  return GENRES.filter((g) => seen.has(g));
}

// ---------------------------------------------------------------------------
// Genre pages — cross-cut views that pull matching prompts from every model.
// Adding a genre here (and tagging prompts with it) creates a new indexed page.
// ---------------------------------------------------------------------------

export const GENRE_PAGES = [
  {
    slug: "continuity",
    genre: "Continuity",
    title: "Continuity Prompts for AI Video — Stop Character Drift",
    description:
      "Free AI video prompts built to survive a continuity audit. Locked wardrobe, anchored lighting and side-specific detail for Seedance, Veo and Kling.",
    h1: "Continuity Prompts: Writing Shots That Don't Drift",
    intro:
      "A character who changes between shot one and shot four isn't a model failure — it's usually a description failure. These prompts are written the way a script supervisor would want them: wardrobe enumerated garment by garment, asymmetric details pinned to a side, light anchored to a named source in a fixed position, and damage written as a causal progression. Each one carries a note explaining what makes it hold up when the next shot reuses it.",
  },
  {
    slug: "cyberpunk-noir",
    genre: "Cyberpunk Noir",
    title: "Cyberpunk Noir AI Video Prompts — Free & Copy-Ready",
    description:
      "Free cyberpunk noir prompts for Seedance 2.5, Veo 3.1, and Kling 3.0. Neon, rain, and chiaroscuro, written for each model. No account needed.",
    h1: "Cyberpunk Noir AI Video Prompts",
    intro:
      "Rain-slick streets, holographic signage, and light that only ever arrives at an angle. These cyberpunk noir prompts are written separately for each model, so the same genre plays to different strengths — long unbroken takes, spoken performance, or full-speed pursuit.",
  },
  {
    slug: "epic-fantasy",
    genre: "Epic Fantasy",
    title: "Epic Fantasy AI Video Prompts — Free & Copy-Ready",
    description:
      "Free epic medieval fantasy prompts for Seedance 2.5, Veo 3.1, and Kling 3.0. Sieges, war councils, and armies at scale. No account needed.",
    h1: "Epic Medieval Fantasy AI Video Prompts",
    intro:
      "Siege ladders, war tables, and shield walls breaking under cavalry. These epic fantasy prompts are written for scale and weight — armor that carries mass, structures that fail convincingly, and crowds that behave like armies rather than copies.",
  },
  {
    slug: "surreal",
    genre: "Surreal",
    title: "Surreal & Abstract AI Video Prompts — Free to Use",
    description:
      "Free surreal and abstract art prompts for Seedance 2.5, Veo 3.1, and Kling 3.0. Dissolving rooms, shifting gravity, impossible light. No account needed.",
    h1: "Surreal and Abstract AI Video Prompts",
    intro:
      "Rooms that dissolve into sand, gravity that changes its mind, faces lit by a source that cannot exist. These surreal prompts use precise physical and optical language to keep impossible images coherent rather than merely strange.",
  },
  {
    slug: "found-footage-horror",
    genre: "Found Footage Horror",
    title: "Found Footage Horror AI Prompts — Free & Copy-Ready",
    description:
      "Free found footage horror prompts for Seedance 2.5, Veo 3.1, and Kling 3.0. Camcorder grain, hard onboard light, and dread. No account needed.",
    h1: "Found Footage Horror AI Video Prompts",
    intro:
      "Onboard light that blows out the center and crushes the edges, timecode burn, and a camera operator whose breathing is part of the sound design. These found footage prompts are written to look recorded rather than shot.",
  },
  {
    slug: "action",
    genre: "Action",
    title: "Action Scene AI Video Prompts — Chases, Fights, Crowds",
    description:
      "Free action prompts for Seedance 2.5, Veo 3.1, and Kling 3.0. Chases, fights, and dense crowd scenes with real physical weight. No account needed.",
    h1: "Action Scene AI Video Prompts",
    intro:
      "Pursuits, hand-to-hand fights, and crowds at full scale. These action prompts are written around velocity and mass — body mechanics that land with weight, camera work that keeps pace, and crowds whose members move independently.",
  },
  {
    slug: "drama",
    genre: "Drama",
    title: "Dramatic Dialogue AI Video Prompts — Free to Use",
    description:
      "Free dramatic scene prompts for Seedance 2.5, Veo 3.1, and Kling 3.0. Performance, dialogue, and close-ups that hold. No account needed.",
    h1: "Dramatic Scene AI Video Prompts",
    intro:
      "Quiet rooms, hard conversations, and faces the camera stays on. These dramatic prompts are built around performance — written-out dialogue for models that lip-sync, and lighting chosen to reveal expression rather than flatter it.",
  },
  {
    slug: "cinematic-realism",
    genre: "Cinematic Realism",
    title: "Cinematic Realism AI Video Prompts — Free to Use",
    description:
      "Free cinematic realism prompts for Seedance 2.5, Veo 3.1, and Kling 3.0. Real spaces, real light, real physics. No account needed.",
    h1: "Cinematic Realism AI Video Prompts",
    intro:
      "Working kitchens, foundry floors, and streets in the rain. These realism prompts lean on accurate material behavior and motivated light — the kind of shot that reads as filmed rather than generated.",
  },
];

export function getGenrePage(slug) {
  return GENRE_PAGES.find((g) => g.slug === slug) ?? null;
}

// All prompts of a given genre, across every model, each tagged with its model.
export function promptsByGenre(genre) {
  const out = [];
  for (const m of MODELS) {
    for (const p of m.prompts) {
      if (p.genre === genre) out.push({ ...p, modelName: m.name, modelSlug: m.slug, maker: m.maker });
    }
  }
  return out;
}