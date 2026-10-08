import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  GeneratedSets — RevaultAI
  Sets built by World Labs' Marble from a photo of a real room, a description,
  or both — photoreal and reusable across every shot in a film. Generating one
  costs credits once; using it costs nothing afterwards. A world takes about
  five minutes, so the page checks on it rather than holding a request open.
*/

// Shown to the creator. The server decides the real charge — keep this in
// step with CREDITS in api/generate-set.js.
const COST = 35;
const FROM_PHOTO = "(from a photo)";

const mono = { fontFamily: "'DM Mono', monospace" };
const btn = {
  background: "none", border: "1px solid var(--border)", color: "var(--muted)", borderRadius: 3,
  padding: "6px 12px", ...mono, fontSize: 10, letterSpacing: "0.08em", cursor: "pointer",
};
const field = {
  width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 3,
  ...mono, fontSize: 11, color: "var(--text)", boxSizing: "border-box",
};

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("unreadable")); };
    img.src = url;
  });
}

// Phone photos are far bigger than a set needs. The photo is shrunk here, in
// the browser, so the upload is quick and fits in a single request.
async function shrinkPhoto(file) {
  const img = await loadImage(file);
  const w = img.naturalWidth, h = img.naturalHeight;
  if (!w || !h) throw new Error("unreadable");
  for (const [edge, quality] of [[2048, 0.86], [1600, 0.8], [1280, 0.72]]) {
    const k = Math.min(1, edge / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * k));
    canvas.height = Math.max(1, Math.round(h * k));
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", quality);
    if (data.length < 3_200_000) return data;
  }
  throw new Error("too large");
}

export default function GeneratedSets({ user, activeProject, notify, selectedId, onPick }) {
  const [sets, setSets] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);
  const fileInput = useRef(null);
  const building = useRef(new Set());

  async function load() {
    if (!user?.id) { setSets([]); return; }
    const { data } = await supabase
      .from("sets")
      .select("id, name, status, caption, tier, prompt, error, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(24);
    const list = data ?? [];
    // Say so when a set that was building has finished.
    for (const s of list) {
      if (building.current.has(s.id) && s.status === "ready") notify?.(`"${s.name}" is ready — pick it under Your sets.`);
    }
    building.current = new Set(list.filter((s) => s.status === "queued" || s.status === "processing").map((s) => s.id));
    setSets(list);
  }
  useEffect(() => { load(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nudge anything still building, every twenty seconds.
  useEffect(() => {
    const waiting = sets.filter((s) => s.status === "queued" || s.status === "processing");
    if (!waiting.length) return;
    timer.current = setTimeout(async () => {
      const { data: sess } = await supabase.auth.getSession();
      for (const s of waiting) {
        try {
          await fetch("/api/set-status", {
            method: "POST",
            headers: { Authorization: "Bearer " + sess?.session?.access_token, "Content-Type": "application/json" },
            body: JSON.stringify({ setId: s.id }),
          });
        } catch { /* try again next time */ }
      }
      load();
    }, 20000);
    return () => clearTimeout(timer.current);
  }, [sets]); // eslint-disable-line react-hooks/exhaustive-deps

  async function remove(id) {
    const { error } = await supabase.from("sets").delete().eq("id", id);
    if (error) { notify?.("Couldn't remove that: " + error.message); return; }
    load();
  }

  // A photo isn't kept, so retrying a photo set means choosing the photo again.
  function retry(s) {
    setName(s.name.replace(/\s\d+$/, ""));
    setPrompt(s.prompt && s.prompt !== FROM_PHOTO ? s.prompt : "");
    setPhoto(null);
    setOpen(true);
  }

  // Two sets called the same thing are impossible to tell apart in a picker.
  function uniqueName(wanted) {
    const taken = new Set(sets.map((s) => s.name));
    if (!taken.has(wanted)) return wanted;
    let n = 2;
    while (taken.has(`${wanted} ${n}`)) n++;
    return `${wanted} ${n}`;
  }

  async function choosePhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setPhoto(await shrinkPhoto(file));
    } catch {
      notify?.("That photo couldn't be read — try a JPEG or PNG.");
    }
  }

  async function generate() {
    const text = prompt.trim();
    if (!photo && text.length < 10) { notify?.("Add a photo of the room, or describe the set in a sentence or two."); return; }
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const r = await fetch("/api/generate-set", {
        method: "POST",
        headers: { Authorization: "Bearer " + sess?.session?.access_token, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: uniqueName(name.trim() || text.slice(0, 60) || "Photo set"),
          prompt: text,
          imageData: photo,
          projectId: activeProject?.id ?? null,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) notify?.(j.error || "Couldn't start that set.");
      else {
        notify?.("Building your set — about five minutes. You can keep working.");
        setOpen(false); setPrompt(""); setName(""); setPhoto(null);
        load();
      }
    } catch { notify?.("Couldn't reach the set builder."); }
    setBusy(false);
  }

  if (!user) return null;

  return (
    <div style={{ marginTop: 10 }}>
      <div className="rs-row">
        <span className="rs-body" style={{ fontSize: 10 }}>Your sets</span>
        {sets.length === 0 && <span className="rs-body" style={{ fontSize: 10, opacity: 0.7 }}>None yet</span>}
        {sets.map((s) => {
          const waiting = s.status === "queued" || s.status === "processing";
          return (
            <button
              key={s.id}
              className={"rs-btn" + (selectedId === s.id ? " on" : "")}
              title={s.status === "failed" ? s.error || "That set failed" : s.caption || s.name}
              disabled={s.status !== "ready"}
              onClick={() => onPick?.(s.id, s.name)}
              style={s.status !== "ready" ? { opacity: 0.55 } : undefined}
            >
              {s.name}{waiting ? " · building…" : s.status === "failed" ? " · failed" : ""}
            </button>
          );
        })}
        {sets.filter((s) => s.id === selectedId).map((s) => (
          <button key={"r" + s.id} className="rs-btn" onClick={async () => {
            const next = window.prompt("Rename this set", s.name);
            if (!next?.trim()) return;
            const { error } = await supabase.from("sets").update({ name: uniqueName(next.trim()) }).eq("id", s.id);
            if (error) notify?.("Couldn't rename: " + error.message); else load();
          }}>Rename</button>
        ))}
        {sets.filter((s) => s.status === "failed").map((s) => (
          <span key={"f" + s.id} style={{ display: "inline-flex", gap: 6 }}>
            <button className="rs-btn" onClick={() => retry(s)}>Retry {s.name}</button>
            <button className="rs-btn" onClick={() => remove(s.id)}>Remove</button>
          </span>
        ))}
        <button className="rs-btn" onClick={() => setOpen((o) => !o)}>{open ? "Cancel" : "+ Generate a set"}</button>
      </div>

      {open && (
        <div style={{ border: "1px solid var(--accent)", borderRadius: 6, padding: "12px 14px", marginTop: 8, background: "var(--bg3)" }}>
          <div style={{ ...mono, fontSize: 10, color: "var(--muted)", lineHeight: 1.7, marginBottom: 8 }}>
            Start from a photo of a real room, a description, or both. You get a photoreal set you can shoot from any angle, in every shot of the film, for as long as you like.
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={64}
            placeholder="Name it — e.g. Maya's kitchen"
            style={{ ...field, padding: "8px 10px", marginBottom: 8 }}
          />

          <input ref={fileInput} type="file" accept="image/*" onChange={choosePhoto} style={{ display: "none" }} />
          <div className="rs-row" style={{ marginBottom: 8, alignItems: "flex-start" }}>
            {photo && <img src={photo} alt="" style={{ width: 132, borderRadius: 4, border: "1px solid var(--border)", display: "block" }} />}
            <div>
              <div className="rs-row">
                <button className="rs-btn" onClick={() => fileInput.current?.click()}>{photo ? "Change photo" : "+ Add a photo of the room"}</button>
                {photo && <button className="rs-btn" onClick={() => setPhoto(null)}>Remove photo</button>}
              </div>
              <div style={{ ...mono, fontSize: 10, color: "var(--muted)", lineHeight: 1.7, marginTop: 6, maxWidth: 520 }}>
                One ordinary photo is enough. Shoot wide from a corner or doorway, in good light — what the photo shows is rebuilt faithfully, and the rest of the room is filled in to match. The photo is sent to World Labs to build the set and is never published or given a public link here.
              </div>
            </div>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder={photo
              ? "Optional — anything the photo doesn't show: what's behind the camera, the time of day"
              : "A large 1970s kitchen with yellowed cabinets, a window over the sink facing a brick wall, late afternoon light, dishes stacked on the drainer"}
            style={{ ...field, padding: "10px 12px", lineHeight: 1.7, resize: "vertical" }}
          />
          <div style={{ ...mono, fontSize: 10, color: "var(--muted)", lineHeight: 1.7, margin: "8px 0" }}>
            Ask for a large room — the camera needs space to stand back from the performers. {COST} credits, once, for a set you use in every shot.
          </div>
          <button style={{ ...btn, borderColor: "var(--accent)", color: "var(--accent)" }} onClick={generate} disabled={busy}>
            {busy ? "Starting…" : `Generate this set (${COST} credits)`}
          </button>
        </div>
      )}
    </div>
  );
}
