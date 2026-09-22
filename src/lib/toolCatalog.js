/*
  toolCatalog — RevaultAI
  Every tool, arranged by the job it does. The /tools page and the Create
  menu both read from this one list, so they can never disagree. Adding a
  tool is one object in the right job.

  access: "free"    — free, no account
          "account" — free, needs an account
          "credits" — spends credits
*/

export const ACCESS_LABEL = {
  free: "Free · no account",
  account: "Free with an account",
  credits: "Uses credits",
};

export const JOBS = [
  {
    id: "plan",
    name: "Plan the scene",
    when: "Before you generate anything",
    tools: [
      { name: "Scene Breakdown", page: "scene-breakdown", access: "free",
        give: "A scene or a logline", get: "A numbered shot list, with a full prompt for every shot",
        blurb: "Size, camera move, lighting and duration for each shot. Character and location descriptions are locked and repeated word for word, which is what keeps them recognisable from cut to cut." },
      { name: "Coverage Planner", page: "coverage", access: "free",
        give: "A scene", get: "The setups an editor needs — and what's missing",
        blurb: "Master, singles, over-the-shoulders, reactions and inserts, ranked by how essential each is. The most useful part is the gaps, and the editorial problem each one creates." },
      { name: "Performance & Blocking", page: "blocking", access: "free",
        give: "A scene with dialogue", get: "Staging, performance direction, and delivery notes",
        blurb: "Where people stand and move relative to camera, and how each line lands. Your dialogue comes back exactly as you wrote it — nothing is rewritten." },
      { name: "Rehearsal Studio", page: "rehearsal", access: "free",
        give: "Where people stand and move", get: "The scene played through, from every camera",
        blurb: "Drag performers and cameras across a timeline and watch animated performers walk their marks. Compare angles on an identical performance, with shot size, lens, eyelines and the 180° line updating live." },
    ],
  },
  {
    id: "design",
    name: "Design each shot",
    when: "Getting one shot right",
    tools: [
      { name: "Shot Director", page: "shot-director", access: "free",
        give: "One moment", get: "Three genuinely different ways to shoot it",
        blurb: "Each approach comes with a shot size, lens, move, lighting, blocking, a full prompt, and the craft reasoning for why it works." },
      { name: "Frame Planner", page: "frame-planner", access: "free",
        give: "One shot", get: "Its opening and closing frames, and the move between",
        blurb: "Two frame descriptions with an image prompt for each, and a note on what must stay identical for the shot to read as continuous." },
      { name: "Prompt Builder", page: "prompt-builder", access: "free",
        give: "A rough idea", get: "A prompt in real cinematography language",
        blurb: "Six cinematic style presets and a strength control, with the craft language it applies shown rather than hidden. Attach a reference still and it writes the shot from what it sees." },
      { name: "Which Model?", page: "which-model", access: "free",
        give: "A shot you want", get: "Ranked models, real costs, and what's likely to break",
        blurb: "A real duration and credit cost for each model, an honest trade-off, and a difficulty score — before you spend anything." },
      { name: "Prompt Library", page: "prompts", access: "free",
        give: "Nothing — just browse", get: "Copy-ready prompts across genres and models",
        blurb: "Director-grade prompts organised by model and genre, including a continuity set with notes on what makes each one hold together." },
    ],
  },
  {
    id: "consistent",
    name: "Keep it consistent",
    when: "The same film from shot to shot",
    tools: [
      { name: "The Vault", page: "vault", access: "account",
        give: "Your characters, places and props, once", get: "Locked descriptions every tool reuses word for word",
        blurb: "Your production bible, with reference images. Record what happens to things over the story — a cracked phone, a soaked jacket — and later shots carry it automatically." },
      { name: "Continuity Check", page: "continuity-check", access: "free",
        give: "A set of shot prompts", get: "Drift and crossed 180° lines, quoted exactly",
        blurb: "A script supervisor's read: characters described two ways, wardrobe that drifts, unmotivated lighting, reverse angles that break screen direction. It flags and quotes — it never rewrites." },
      { name: "Script Supervisor", page: "projects", access: "account", inMenu: false, where: "Built into Projects",
        give: "A project with shots and takes", get: "Every contradiction across the project, including the story",
        blurb: "Reads the whole project at once: a shot starting where the last one didn't end, a declared change no later shot shows, an unresolved flaw in a take you're using. Then, on request, a story read — a character acting on something they haven't learned yet, time moving the wrong way." },
      { name: "Set Memory", page: "takes", access: "account", inMenu: false, where: "Built into Takes",
        give: "The take you chose", get: "How it really ends — and what the next shot inherits",
        blurb: "Reads the closing frames of your keeper against how the shot was meant to end. A model going off-plan isn't always wrong: adopt what it did and the next shot starts from there, or keep the plan. Your Vault stays untouched either way." },
      { name: "Shot Specs", page: "specs", access: "account",
        give: "Your planned shots", get: "What survives a switch to another model — before you pay",
        blurb: "Each shot held as structure rather than one model's prompt. Switch models and see exactly what carries across, what gets reworded, and what that model can't do." },
    ],
  },
  {
    id: "make",
    name: "Make and fix",
    when: "Generating, and recovering when it goes wrong",
    tools: [
      { name: "Generate", page: "generate", access: "credits",
        give: "A prompt, or a still to animate", get: "Video from four models on one credit balance",
        blurb: "Seedance, Veo, Kling and Wan behind one balance. No subscription and no API keys — pay per second of output." },
      { name: "Generation Autopsy", page: "autopsy", access: "free",
        give: "A prompt that disappointed", get: "Why it failed, and a revised prompt",
        blurb: "Causes ranked by confidence, with the offending wording quoted, and a revised prompt built to hold." },
      { name: "Take Debugger", page: "takes", access: "account", inMenu: false, where: "Built into every take",
        give: "A take that isn't what you planned", get: "What was asked for, what appeared, when — and a repaired prompt",
        blurb: "Samples frames across the finished clip and reads them against the shot's plan: characters, wardrobe, props, camera, action. Each miss comes with a likely cause and a fix, plus a revised prompt that keeps the shot the same." },
      { name: "Polish", page: "generate", access: "credits",
        give: "A clip you've made", get: "Upscaled, extended, or lip-synced",
        blurb: "Upscale to 1080p or 4K, extend a clip past the length cap, and re-sync dialogue — all on a clip you already have." },
    ],
  },
  {
    id: "finish",
    name: "Finish the film",
    when: "From a pile of takes to an edit",
    tools: [
      { name: "Takes", page: "takes", access: "account",
        give: "Every attempt at every shot", get: "Grouped shots, keepers chosen, rejects explained",
        blurb: "Generations group themselves into shots. Select, star, reject with a reason, compare side by side — and see what a usable shot actually costs you." },
      { name: "Finish", page: "finish", access: "account",
        give: "All your takes, and a sentence about the scene", get: "A cut to watch, and an edit that opens in your editor",
        blurb: "It finds the usable seconds hidden inside failed takes, assembles a cut you can watch in the browser, names the shots still missing, and exports an edit that opens already cut in Resolve or Premiere." },
      { name: "Production Brain", page: "projects", access: "account", inMenu: false, where: "Built into Projects",
        give: "A project in progress", get: "What's stuck, what it's costing you, and what to do next",
        blurb: "Read from the project's own records — shots burning attempts without a keeper, the failure you hit most, decisions waiting on you, planned shots never made. Every line is something your data can prove; it never guesses." },
      { name: "Projects", page: "projects", access: "account",
        give: "A film you're working on", get: "What to do next, and a continuity report",
        blurb: "Keeps a film's characters, scenes, shots and takes together, with a read on what's unfinished and where the story contradicts itself. Nothing requires a project." },
    ],
  },
];

// One scene taken all the way through — the page's worked example.
export const EXAMPLE = {
  title: "One scene, from a page of script to an edit",
  scene: "Maya slips an envelope into her bag while Jonah's back is turned. She almost gets caught.",
  steps: [
    { page: "vault", tool: "The Vault", give: "Maya, Jonah and the café — a description and a reference photo each.", get: "Descriptions that every tool from here on reuses word for word, so Maya looks like Maya in every shot." },
    { page: "scene-breakdown", tool: "Scene Breakdown", give: "The half page above.", get: "Seven numbered shots — the wide, her hands, his turn, her face — each with a prompt, and Maya described identically in all seven." },
    { page: "rehearsal", tool: "Rehearsal Studio", give: "Maya crossing to the counter, Jonah turning on the fourth second.", get: "The scene played from two cameras. From B-cam, the envelope is plainly in Jonah's eyeline — so you move him before generating anything." },
    { page: "which-model", tool: "Which Model?", give: "Shot 4, the close-up on her hands.", get: "The model best suited to hand work, the length to keep it to, the real cost, and a warning that hands are the risk." },
    { page: "generate", tool: "Generate", give: "Each shot's prompt, straight from the breakdown.", get: "Your takes. A few of them won't work." },
    { page: "autopsy", tool: "Generation Autopsy", give: "The hands shot that keeps going wrong.", get: "The phrase causing it, and a revised prompt that holds." },
    { page: "takes", tool: "Takes", give: "Everything you generated.", get: "Each shot's attempts grouped together — keepers selected, failures tagged with why." },
    { page: "finish", tool: "Finish", give: "Every take, keepers and rejects, and: \"30 seconds — she almost gets caught.\"", get: "A cut to watch, using a second and a half of a rejected take — her reaction, before the face drifted. The one shot still missing, with its prompt. Then an edit that opens already cut in Resolve." },
  ],
};

export function toolCount() {
  return JOBS.reduce((n, j) => n + j.tools.length, 0);
}