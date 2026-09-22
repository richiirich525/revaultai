import { useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  PromoteDraft — RevaultAI
  Draft first, check it, then pay full price only for a prompt that works.
  Promoting is a fresh generation at full quality with the same prompt,
  length and framing — close to the draft, not an exact copy of it.
*/

// Draft tier -> its full-quality model, and what that costs per second.
// Keep in step with creditsPerSecond in api/generate-video.js.
const PROMOTE = {
  "seedance-2.0-480": { to: "seedance-2.0", label: "Seedance 2.0", perSecond: 6 },
  "seedance-2.5-480": { to: "seedance-2.5", label: "Seedance 2.5", perSecond: 12 },
};

export function canPromote(generation) {
  return !!PROMOTE[generation?.model] && generation?.status === "complete";
}

const mono = { fontFamily: "'DM Mono', monospace" };

export default function PromoteDraft({ generation, setGenPrefill, setPage }) {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState(undefined);
  if (!canPromote(generation)) return null;

  const target = PROMOTE[generation.model];
  const seconds = Number(generation.duration_seconds) || 5;
  const fullCost = target.perSecond * seconds;
  const draftCost = Number(generation.credits_spent) || null;

  async function openPanel() {
    setOpen(true);
    // Read the latest check — it may have been run since this list loaded.
    const { data } = await supabase.from("generations").select("debug_report").eq("id", generation.id).maybeSingle();
    setReport(data?.debug_report ?? null);
  }

  function promote(prompt) {
    setGenPrefill?.({
      prompt,
      generateModelKey: target.to,
      aspectRatio: generation.aspect_ratio || "16:9",
      duration: seconds,
      filmSpecId: generation.film_spec_id ?? undefined,
      coverageSlotId: generation.coverage_slot_id ?? undefined,
      promotedFrom: generation.id,
    });
    setPage("generate");
    window.scrollTo?.(0, 0);
  }

  if (!open) {
    return (
      <button className="gen-button" onClick={openPanel} title="Re-run this prompt at full quality">
        Promote to full quality
      </button>
    );
  }

  const errors = (report?.findings ?? []).filter((f) => f.severity === "error");
  const repaired = report?.repairPrompt?.trim();

  return (
    <div style={{ border: "1px solid var(--accent)", borderRadius: 6, padding: "14px 16px", marginTop: 10, background: "var(--bg3)" }}>
      <div style={{ ...mono, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 8 }}>
        Promote to {target.label}
      </div>
      <div style={{ ...mono, fontSize: 11, color: "var(--muted)", lineHeight: 1.8, marginBottom: 10 }}>
        {draftCost ? `This draft cost ${draftCost} credits. ` : ""}Full quality: <span style={{ color: "var(--text)" }}>{fullCost} credits</span> for {seconds} seconds.
        {" "}It's a fresh take with the same prompt, length and framing — close to this draft, not an exact copy.
      </div>

      {report === undefined ? (
        <div style={{ ...mono, fontSize: 10, color: "var(--muted)" }}>Checking for a debug report…</div>
      ) : report === null ? (
        <div style={{ ...mono, fontSize: 10, color: "#E5B769", lineHeight: 1.7, marginBottom: 10 }}>
          This draft hasn't been checked yet. Running <b style={{ fontWeight: 400, color: "var(--text)" }}>Debug this take</b> first is free, and it's the point of drafting — find the problems at half price.
        </div>
      ) : errors.length ? (
        <div style={{ ...mono, fontSize: 10, color: "#F87171", lineHeight: 1.7, marginBottom: 10 }}>
          The check found {errors.length} problem{errors.length === 1 ? "" : "s"}: {errors.slice(0, 2).map((e) => e.observed).join(" ")}
          {repaired ? " Its repaired prompt fixes the wording without changing the shot." : ""}
        </div>
      ) : (
        <div style={{ ...mono, fontSize: 10, color: "#4ADE80", lineHeight: 1.7, marginBottom: 10 }}>
          Checked — nothing missed. This prompt is ready for full quality.
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {errors.length > 0 && repaired && (
          <button className="gen-button" onClick={() => promote(repaired)} style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
            Promote with the repaired prompt →
          </button>
        )}
        <button className="gen-button" onClick={() => promote(generation.prompt || "")} disabled={report === undefined}>
          {errors.length ? "Promote as is" : "Promote →"}
        </button>
        <button className="gen-button" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}