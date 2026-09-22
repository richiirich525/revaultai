/*
  edl — RevaultAI (Finish, pass 4)
  Writes the assembled cut as a CMX 3600 EDL (opens in Resolve and Premiere),
  plus a plain-language cut sheet and import instructions.
*/

export function timecode(frames, fps) {
  const f = Math.max(0, Math.round(frames));
  const ff = f % fps, s = Math.floor(f / fps);
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60, ff].map((n) => String(n).padStart(2, "0")).join(":");
}

const ascii = (s, n) => String(s ?? "").normalize("NFKD").replace(/[^\x20-\x7E]/g, "").slice(0, n);

// clips: { [generationId]: { name, fps, nominal, hasAudio } }
export function buildEdl({ title, shots, clips, fps }) {
  const lines = [`TITLE: ${ascii(title || "RevaultAI scene", 60)}`, "FCM: NON-DROP FRAME", ""];
  let record = 3600 * fps; // editors start timelines at 01:00:00:00
  let n = 0;
  for (const s of shots) {
    const c = clips[s.generationId];
    if (!c) continue;
    n++;
    const inF = Math.round(s.from * fps);
    const outF = Math.max(inF + 1, Math.round(s.to * fps));
    const len = outF - inF;
    const track = c.hasAudio ? "AA/V" : "V";
    lines.push(
      `${String(n).padStart(3, "0")}  AX       ${track.padEnd(5)} C        ${timecode(inF, fps)} ${timecode(outF, fps)} ${timecode(record, fps)} ${timecode(record + len, fps)}`,
      `* FROM CLIP NAME: ${c.name}`,
      ""
    );
    record += len;
  }
  return lines.join("\n");
}

export function buildCutSheet({ title, scene, shots, clips, fps, cut, mixedRates }) {
  const out = [];
  out.push(`${title || "RevaultAI scene"} — cut sheet`, "");
  if (scene) out.push(`Scene: ${scene}`, "");
  let at = 0;
  const total = shots.reduce((sum, s) => sum + (clips[s.generationId] ? s.to - s.from : 0), 0);
  out.push(`Length: ${total.toFixed(1)}s${cut?.target ? ` (target ${cut.target}s)` : ""}   Timeline: ${fps} fps`, "");
  if (mixedRates) out.push(`Note: ${mixedRates}`, "");
  out.push("SHOTS");
  let n = 0;
  for (const s of shots) {
    const c = clips[s.generationId];
    if (!c) continue;
    n++;
    const len = s.to - s.from;
    out.push(
      `${String(n).padStart(2, " ")}. ${at.toFixed(1)}s–${(at + len).toFixed(1)}s  ${c.name}  (use ${s.from.toFixed(1)}s to ${s.to.toFixed(1)}s of the clip)`,
      `    ${s.role ? s.role + " — " : ""}${s.why || ""}`
    );
    at += len;
  }
  if (cut?.missing?.length) {
    out.push("", "STILL NEEDED");
    for (const m of cut.missing) {
      out.push(`- ${m.what}${m.why ? " — " + m.why : ""}`);
      if (m.prompt) out.push(`  Prompt: ${m.prompt}`);
    }
  }
  if (cut?.notes) out.push("", "EDITOR'S NOTES", typeof cut.notes === "string" ? cut.notes : [].concat(cut.notes).join("\n"));
  return out.join("\n") + "\n";
}

export function buildReadme({ edlName, fps }) {
  return [
    "HOW TO OPEN THIS EDIT",
    "",
    "Unzip everything into one folder first, so the clips sit beside the EDL.",
    "",
    "DaVinci Resolve",
    "  1. Import all the clips from this folder into the Media Pool.",
    `  2. File > Import > Timeline, and choose ${edlName}.`,
    "  3. Leave 'Automatically import source clips into media pool' unticked,",
    "     and Resolve links each shot to its clip by name.",
    "",
    "Adobe Premiere Pro",
    `  1. File > Import, and choose ${edlName}.`,
    `  2. Set the sequence to ${fps} fps when asked.`,
    "  3. If shots show as offline, right-click them > Link Media, and point",
    "     to this folder.",
    "",
    "CapCut and other editors",
    "  These don't open EDLs. Follow cut-sheet.txt instead: it lists every shot",
    "  in order, and which seconds of which clip to use.",
    "",
    "Made with RevaultAI Finish — revaultai.com",
    "",
  ].join("\n");
}