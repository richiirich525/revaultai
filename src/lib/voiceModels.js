/*
  voiceModels — RevaultAI

  The recording studio. Picture already has a stage, a camera department and a
  cutting room; this is the room that was missing, and the reason it was
  missing is not that nobody wanted it — lip sync has shipped for months with
  nowhere on the lot to make the audio it consumes, and Performance & Blocking
  has been writing delivery notes for lines that could not be performed here.

  WHAT THE MODEL CAN AND CANNOT DO, because it shapes everything downstream:

    - VibeVoice takes a single `script` string with "Speaker 0:" prefixes, and
      a `speakers` array. Each speaker is either a named preset or an
      `audio_url` pointing at a voice sample — which is what lets a Vault
      character keep one voice across every scene, the way a locked
      description keeps one face.
    - Four speakers at most. A scene with five characters who speak is a real
      scene, so that limit is reported before anything is charged, not after.
    - 30,000 characters of script.
    - There is NO per-line direction parameter. The delivery notes from
      Performance & Blocking cannot be passed to it, and a parenthetical in
      the script gets read out loud rather than acted. Direction-capable
      models exist (Gemini TTS, ElevenLabs v3) but are single-voice, so they
      belong to a per-line take, not to a scene read. Nothing here pretends
      otherwise.
    - It returns one audio file for the whole scene, with its duration. That
      makes a read-through: how the scene sounds, how long it runs, where it
      drags. It is not per-shot audio, and a scene read cannot be handed
      straight to lip sync for one shot.
*/

export const VOICE_MODELS = {
  "vibevoice-7b": {
    falId: "fal-ai/vibevoice/7b",
    label: "Scene read-through — up to four voices",
    maxSpeakers: 4,
    maxScript: 30000,
    // Flat rate: one call reads the whole scene, and the cost does not depend
    // on how the script is split between speakers.
    creditsPerThousandChars: 1,
    minCredits: 1,
    presets: [
      "Alice [EN]",
      "Carter [EN]",
      "Frank [EN]",
      "Maya [EN]",
      "Mary [EN] (Background Music)",
      "Bowen [ZH]",
      "Xinran [ZH]",
      "Anchen [ZH] (Background Music)",
    ],
    defaultPreset: "Alice [EN]",
  },
};

export const DEFAULT_VOICE_MODEL = "vibevoice-7b";

/* The presets a creator should see first: English, no backing music. */
export function plainPresets(modelKey = DEFAULT_VOICE_MODEL) {
  const m = VOICE_MODELS[modelKey];
  if (!m) return [];
  return m.presets.filter((p) => p.includes("[EN]") && !p.includes("Background Music"));
}

/*
  Turn the Performance & Blocking result into one script.

  `characters` is that tool's own output shape — [{ character, lines: [{ line,
  delivery }] }] — so a read-through is one press from the direction you
  already have, with the writer's words reproduced exactly as blocking.js
  promises not to change them.

  `voiceFor` maps a character name to { preset } or { audio_url }, which is
  where a Vault voice arrives. Order matters and is preserved: speaker 0 is
  the first character with a line.

  ONE CAVEAT, and it is the reason buildScriptFromDialogue exists below:
  blocking.js returns lines grouped by character and keeps no record of the
  order the scene speaks them in, so that order cannot be recovered here. The
  turns below are interleaved round-robin, which is right for a scene that
  alternates and wrong for one where somebody has two lines together. When
  the creator's own dialogue is to hand, parse that instead — it has the real
  order in it.

  Returns { script, speakers, names, chars, lineCount } or { error }.
*/
export function buildScript(characters, voiceFor = () => null, modelKey = DEFAULT_VOICE_MODEL) {
  const model = VOICE_MODELS[modelKey];
  if (!model) return { error: "Unknown voice model." };
  if (!Array.isArray(characters) || !characters.length) {
    return { error: "There is no dialogue to record yet. Run Performance & Blocking on a scene with lines in it first." };
  }

  // Only characters who actually speak get a voice. A character who is in the
  // scene but silent is not a speaker, and would otherwise burn one of four.
  const speaking = [];
  for (const c of characters) {
    const name = String(c?.character ?? "").trim();
    const lines = Array.isArray(c?.lines) ? c.lines : [];
    const spoken = lines
      .map((l) => String(l?.line ?? "").trim())
      .filter(Boolean);
    if (!name || !spoken.length) continue;
    const existing = speaking.find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (existing) existing.lines.push(...spoken);
    else speaking.push({ name, lines: spoken });
  }

  if (!speaking.length) {
    return { error: "Nobody in this scene has a line to say. Performance & Blocking returns an empty line list when a scene has no dialogue." };
  }
  if (speaking.length > model.maxSpeakers) {
    return {
      error: `This scene has ${speaking.length} speaking characters and this model reads ${model.maxSpeakers} voices at once: ${speaking.map((s) => s.name).join(", ")}. Record it in two passes, or cut it down.`,
    };
  }

  /*
    The script keeps the scene's own order of speech, not each character's
    lines grouped together — a read-through where one character says
    everything and then the other replies is not a read-through. Blocking
    returns lines grouped by character, so they are interleaved back into
    turns here.
  */
  const turns = [];
  const cursor = speaking.map(() => 0);
  let guard = 0;
  while (guard++ < 10000) {
    let moved = false;
    for (let i = 0; i < speaking.length; i++) {
      if (cursor[i] < speaking[i].lines.length) {
        turns.push({ speaker: i, text: speaking[i].lines[cursor[i]] });
        cursor[i]++;
        moved = true;
      }
    }
    if (!moved) break;
  }

  return assemble(turns, speaking.map((s) => s.name), voiceFor, model);
}

/*
  The same thing from the creator's own dialogue, which is the better input
  because it carries the order the scene is actually spoken in.

  Accepts what people write: a name, a colon, the line. A continuation line
  with no name belongs to whoever spoke last, so wrapped text and blank lines
  between speeches both behave. Parentheticals on their own line are stage
  direction and are dropped rather than read aloud.
*/
export function buildScriptFromDialogue(text, voiceFor = () => null, modelKey = DEFAULT_VOICE_MODEL) {
  const model = VOICE_MODELS[modelKey];
  if (!model) return { error: "Unknown voice model." };
  const raw = String(text ?? "").trim();
  if (!raw) return { error: "Paste the scene's dialogue, or run Performance & Blocking first." };

  const order = [];           // speaker names, in first-spoken order
  const turns = [];
  let current = -1;
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    // Stage direction on its own line is not speech.
    if (/^\(.*\)$/.test(line) || /^\[.*\]$/.test(line)) continue;
    const m = line.match(/^([^:]{1,40}):\s*(.*)$/);
    if (m) {
      const name = m[1].trim().replace(/\s*\([^)]*\)\s*$/, "").trim();
      const said = m[2].trim();
      if (!name) continue;
      let idx = order.findIndex((n) => n.toLowerCase() === name.toLowerCase());
      if (idx < 0) { order.push(name); idx = order.length - 1; }
      current = idx;
      if (said) turns.push({ speaker: idx, text: said });
      continue;
    }
    // A continuation of the last speech.
    if (current >= 0 && turns.length) turns[turns.length - 1].text += " " + line;
  }

  if (!turns.length) {
    return { error: "No dialogue found. Write it as one speech per line, like \"RUTH: You said seven.\"" };
  }
  if (order.length > model.maxSpeakers) {
    return { error: `That scene has ${order.length} speaking characters and this model reads ${model.maxSpeakers} voices at once: ${order.join(", ")}. Record it in two passes, or cut it down.` };
  }
  return assemble(turns, order, voiceFor, model);
}

/* The half both front doors share: render the script and resolve the voices. */
function assemble(turns, names, voiceFor, model) {
  const script = turns.map((t) => `Speaker ${t.speaker}: ${t.text}`).join("\n");
  if (script.length > model.maxScript) {
    return { error: `That script is ${script.length.toLocaleString()} characters and the limit is ${model.maxScript.toLocaleString()}. Record the scene in sections.` };
  }
  const speakers = names.map((name) => {
    const v = voiceFor(name);
    if (v && typeof v.audio_url === "string" && /^https:\/\//.test(v.audio_url)) {
      return { audio_url: v.audio_url };
    }
    const preset = v && typeof v.preset === "string" && model.presets.includes(v.preset) ? v.preset : null;
    return { preset: preset ?? model.presets[0] };
  });
  return { script, speakers, names, chars: script.length, lineCount: turns.length };
}

/* What a read-through costs, before anything is charged. */
export function costOf(chars, modelKey = DEFAULT_VOICE_MODEL) {
  const m = VOICE_MODELS[modelKey];
  if (!m) return 0;
  return Math.max(m.minCredits, Math.ceil((Number(chars) || 0) / 1000 * m.creditsPerThousandChars));
}
