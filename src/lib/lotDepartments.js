/*
  The departments of the lot.

  One entry per department, not per tool: a real lot has a camera department
  with several people in it, not a building per job. `tools` lists the doors
  in that department — a single-door department is one clickable card, as
  before; a department with several shows them as links.

  This list is checked against src/lib/toolCatalog.js by
  scripts/check-lot.mjs, which is the only reason it cannot drift again:
  every tool in the catalog has to appear in some department here, or be
  named in SUB_TOOLS there as something built into another page.
*/
export const DEPARTMENTS = [
  {
    lead: "The writers' building.",
    name: "Scene Breakdown",
    body: "A scene or a logline becomes a numbered shot list, each shot with a full prompt. Characters and locations are described identically in every one, which is what keeps them recognizable from cut to cut.",
    tools: [["Scene Breakdown", "scene-breakdown"]],
  },
  {
    /*
      Casting follows the script on a real lot, which is also where it belongs
      here: these are the two places where the person using the site becomes
      the person on screen rather than the one directing it.
    */
    lead: "The casting office.",
    name: "Casting",
    body: "One photograph becomes a locked character \u2014 a fixed description of a face that every later prompt reuses word for word, which is what stops a person drifting between shots. Draw that character as a cartoon, a comic or claymation; put it in a scene with a genre and a beat; send a link and have somebody else land in the same frame with their own face. Several angles, shot from a phone or in the booth, make it hold up when the camera moves. Nobody is ever cast from a photograph somebody else uploaded of them.",
    tools: [
      ["Cast Yourself", "cast"],
      ["Animate Yourself", "animate"],
      ["Memory Cinema", "memory"],
    ],
  },
  {
    lead: "The first AD.",
    name: "Coverage Planner",
    body: "The setups an editor actually needs to cut the scene — master, singles, over-the-shoulders, reactions, inserts — and an honest read on what is missing.",
    tools: [["Coverage Planner", "coverage"]],
  },
  {
    lead: "The floor.",
    name: "Performance & Blocking",
    body: "Where people stand and move relative to camera, acting direction you can play, and delivery notes on every line you wrote. Your dialogue comes back exactly as you wrote it.",
    tools: [["Performance & Blocking", "blocking"]],
  },
  {
    lead: "The stage, and the art department.",
    name: "Rehearsal Studio",
    body: "Block a scene over time. Move performers and cameras across a timeline, then compare angles on one identical performance. Shot size, lens and eyelines update as you move. The set is dressed here too — pick a room or describe the furniture, then have the location rendered as a plate the generator matches shot to shot.",
    tools: [["Rehearsal Studio", "rehearsal"]],
  },
  {
    lead: "The camera department.",
    name: "Shot design",
    body: "Three genuinely different ways to shoot a moment, the opening and closing frames of a move, and the craft language that gets any of it past a model. Nothing here costs a credit.",
    tools: [
      ["Shot Director", "shot-director"],
      ["Frame Planner", "frame-planner"],
      ["Prompt Builder", "prompt-builder"],
      ["Prompt Library", "prompts"],
    ],
  },
  {
    lead: "The rental house.",
    name: "Models and specs",
    body: "Which model suits the shot, what it really costs and what is likely to break — then the shot held as structure rather than one model's wording, so you can see what survives a switch before you pay for it.",
    tools: [
      ["Which Model?", "which-model"],
      ["Shot Specs", "specs"],
    ],
  },
  {
    lead: "Wardrobe, casting and the prop house.",
    name: "The Vault",
    body: "Your characters, places and props recorded once, with reference photos, and reused word for word by every tool downstream. What happens to things over the story is recorded too — a cracked phone, a soaked jacket — and later shots inherit it.",
    tools: [["The Vault", "vault"]],
  },
  {
    lead: "The notebook.",
    name: "Continuity Check",
    body: "Reads a shot list the way a script supervisor reads a shooting script: a character described two ways, wardrobe that drifts, light that moves for no reason, a reverse angle that breaks screen direction. It flags and quotes — it never rewrites. The read across a whole project is on this page, above.",
    tools: [["Continuity Check", "continuity-check"]],
  },
  {
    lead: "The lab.",
    name: "Generate and diagnose",
    body: "Five model families on one credit balance, text to video or animated from a still — and when a take disappoints, the ranked reasons why, with the offending wording quoted and a revised prompt built to hold.",
    tools: [
      ["Generate", "generate"],
      ["Generation Autopsy", "autopsy"],
    ],
  },
  {
    lead: "The recording studio.",
    name: "Recording Studio",
    body: "A scene read aloud in your characters' own voices, before a frame of it is generated. A voice set on a character in the Vault is reused every time they speak, the way their locked description is. Four voices to a read, and the turn order is the order you wrote.",
    tools: [["Recording Studio", "recording-studio"]],
  },
  {
    lead: "Dailies.",
    name: "Takes",
    body: "Generations group themselves into shots: select, star, reject with a reason, compare side by side, and see what a usable shot actually costs. Every take carries its own debugger, and the keeper's closing frames are read for what the next shot inherits.",
    tools: [["Takes", "takes"]],
  },
  {
    lead: "The cutting room.",
    name: "Finish",
    body: "Finds the usable seconds hidden inside failed takes, assembles a cut you can watch in the browser, names the shots still missing, and exports an edit that opens already cut in Resolve or Premiere.",
    tools: [["Finish", "finish"]],
  },
  {
    lead: "The production office.",
    name: "Projects",
    body: "Keeps a film's characters, scenes, shots and takes together, with a read on what is stuck, what it is costing and what to do next — every line something the project's own records can prove. Nothing requires a project.",
    tools: [["Projects", "projects"]],
  },
];
