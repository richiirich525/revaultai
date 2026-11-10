import { useState } from "react";
import { GEN_MODELS } from "./lib/genModels.js";
import { captureLastFrame } from "./lib/lastFrame.js";

/*
  PartTwo — RevaultAI

  One press to continue a take: the next shot opens on the frame this one
  ended on, with the same cast, model, framing and length, and the previous
  prompt carried over as text to edit.

  Everything this does could already be done by hand in four steps — open the
  frame picker, jump to the last frame, use it, then re-pick the cast. The
  steps were the problem. Somebody who has just watched a take they like is
  one press away from a second one, or four presses and a form away from
  closing the tab.

  The prompt is carried rather than cleared because the character and
  location descriptions live in it; what changes between two shots is the
  action, and deleting a sentence is easier than retyping a face.

  The frame is the one the creator saved in the End Frame panel when there is
  one — they chose it for a reason, usually that the final instant had
  drifted — and otherwise the last frame, read here.

  One limit this does not hide: only the MiniMax tiers keep reference photos
  when a starting frame is attached. On the other models the frame is kept
  and the cast is dropped, and the readiness check on Generate says so in
  words before anything is spent.
*/

const plain = {
  background: "none", border: "1px solid var(--border)", color: "var(--muted)", borderRadius: 3,
  padding: "6px 12px", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.08em", cursor: "pointer",
};

/*
  The label on the other end: a take that continues another says so. The
  earlier take is looked up among the ones the page already loaded, and when
  it is not there — an older take, or one since deleted — the line still says
  this is a continuation rather than saying nothing.
*/
export function ContinuesLine({ generation, all }) {
  if (!generation?.continues_from) return null;
  const parent = (all ?? []).find((x) => x.id === generation.continues_from);
  const words = String(parent?.prompt ?? "").replace(/\s+/g, " ").trim();
  const quoted = words.length > 70 ? words.slice(0, 70).trimEnd() + "\u2026" : words;
  return (
    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.06em", color: "var(--muted)", margin: "6px 0" }}>
      {quoted ? `Part 2 \u00b7 continues \u201c${quoted}\u201d` : "Part 2 \u00b7 continues an earlier take"}
    </div>
  );
}

export default function PartTwo({ generation, setGenPrefill, setPage, notify, className }) {
  const [busy, setBusy] = useState(false);
  if (!generation || generation.status !== "complete" || !setGenPrefill) return null;

  async function go() {
    setBusy(true);
    try {
      let frame = generation.end_frame_url || null;
      let frameName = "the frame the last take ended on";
      if (!frame) {
        const got = await captureLastFrame(generation.id);
        frame = got.url;
        frameName = "the last frame of the take before";
      }

      const known = GEN_MODELS.some((m) => m.key === generation.model);
      const cast = Array.isArray(generation.vault_ref_ids) ? generation.vault_ref_ids : null;

      setGenPrefill({
        prompt: generation.prompt || "",
        imageUrl: frame,
        imageName: frameName,
        ...(cast && cast.length ? { vaultRefIds: cast } : {}),
        ...(known ? { generateModelKey: generation.model } : {}),
        aspectRatio: generation.aspect_ratio || "16:9",
        duration: Number(generation.duration_seconds) || 5,
        continuesFrom: generation.id,
      });
      setPage?.("generate");
      window.scrollTo?.(0, 0);
    } catch (err) {
      notify?.((err.message || "Couldn't read the last frame.") + " You can still pick it by hand with the frame picker.");
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      className={className}
      style={className ? undefined : plain}
      onClick={go}
      disabled={busy}
      title="Start the next shot where this one ended, with the same cast"
    >
      {busy ? "Reading the last frame…" : "Part 2 →"}
    </button>
  );
}
