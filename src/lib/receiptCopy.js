/*
  receiptCopy — RevaultAI

  The words a production receipt shows when it travels: the page title and
  the one-line summary that becomes the search snippet and the link preview.

  One module because two places need it. scripts/prerender.js writes these
  tags into static HTML, which is what a crawler and every link unfurler
  actually read, and src/lib/seo.js writes the same tags during in-app
  navigation. Two copies of this logic would drift, and the half that drifts
  is the half nobody looks at.

  The rule that matters here is visibility. A creator chooses, field by
  field, what their receipt shows, and credits and attempt counts are OFF by
  default. A link preview is a louder surface than the page it points at, so
  anything hidden on the page must be absent from the preview too. Every
  figure below is behind its own flag, and when nothing is shown the summary
  says nothing rather than reaching for a number.
*/

const n = (v) => (typeof v === "number" && isFinite(v) ? v : null);

export function receiptTitle(filmTitle, who) {
  const t = String(filmTitle || "A film").trim();
  const base = who ? `How ${t} was made, by ${who}` : `How ${t} was made`;
  return (base.length > 60 ? `How ${t} was made` : base) + " | RevaultAI";
}

/**
 * One sentence about the craft, assembled only from fields the creator has
 * published. Returns a fallback that leaks nothing when they have published
 * the receipt but shown none of its figures.
 */
export function receiptSummary(facts = {}, visibility = {}, commentary = null) {
  const on = (k) => visibility?.[k] === true;

  // The director's own words beat any figure, when there are enough of them.
  const notes = String(commentary || "").replace(/\s+/g, " ").trim();
  if (on("commentary") && notes.length >= 60) {
    return notes.length <= 155 ? notes : notes.slice(0, 152).trimEnd() + "…";
  }

  const parts = [];

  if (on("models") && Array.isArray(facts.models) && facts.models.length > 0) {
    const names = facts.models.slice(0, 3).map((m) => m.key).filter(Boolean);
    if (names.length === 1) parts.push(`Made with ${names[0]}`);
    else if (names.length > 1) parts.push(`Made with ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`);
  }

  const gens = n(facts.generations);
  if (on("generations") && gens) parts.push(`${gens} generation${gens === 1 ? "" : "s"}`);

  const apk = n(facts.attemptsPerKeeper);
  if (on("attemptsPerKeeper") && apk) parts.push(`${apk} attempts per keeper`);

  const credits = n(facts.totalCredits);
  if (on("credits") && credits) parts.push(`${credits} credits spent`);

  if (on("rejections") && Array.isArray(facts.rejectionReasons) && facts.rejectionReasons.length > 0) {
    parts.push(`takes rejected for ${facts.rejectionReasons.slice(0, 2).map((r) => r.reason).join(" and ")}`);
  }

  if (parts.length === 0) {
    return "A production receipt on RevaultAI: what a film took to make, recorded as it was made.";
  }

  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const line = parts.map(cap).join(". ").replace(/\.$/, "") + ".";
  return line.length <= 155 ? line : line.slice(0, 152).trimEnd() + "…";
}
