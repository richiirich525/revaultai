/*
  assetState — RevaultAI
  A vault entry is a static description. Mutations make it temporal: what's
  true about this character, prop or location at a given point in the story.
*/

// Every mutation at or before this beat, oldest first — state accumulates.
export function activeAt(mutations, beat) {
  return (mutations ?? [])
    .filter((m) => Number(m.beat) <= Number(beat))
    .sort((a, b) => a.beat - b.beat || String(a.created_at).localeCompare(String(b.created_at)));
}

// The locked description plus everything that has happened to it by now.
export function compileEntry(entry, mutations, beat) {
  const base = [entry.description, entry.wardrobe, entry.distinguishing]
    .filter((p) => typeof p === "string" && p.trim())
    .join(" ")
    .trim();

  const active = activeAt(mutations, beat);
  if (active.length === 0) return { text: base, applied: [] };

  const modifiers = active.map((m) => m.modifier.trim().replace(/\.$/, ""));
  return {
    text: base + " " + modifiers.join(". ") + ".",
    applied: active.map((m) => ({ beat: m.beat, event: m.event, modifier: m.modifier })),
  };
}

// Compile a whole selection for a given beat.
export function compileSelection(entries, mutationsByEntry, beat) {
  return entries.map((e) => {
    const { text, applied } = compileEntry(e, mutationsByEntry[e.id], beat);
    return { ...e, compiledDescription: text, appliedMutations: applied };
  });
}