import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabase.js";
import { buildScriptFromDialogue, costOf, plainPresets } from "./lib/voiceModels.js";

/*
  RecordingStudioPage — RevaultAI

  The room that was missing. Lip sync has shipped for months with nowhere on
  the lot to make the audio it consumes, and Performance & Blocking has been
  writing delivery notes for lines that could not be performed here.

  The script is built in the browser as you type, from the same module the
  server uses, so the cast, the turn order and the price are all visible
  before a credit moves. The server rebuilds it from the same code and
  resolves the voices itself — nothing here is trusted to name a voice.

  What this room does NOT do, stated here because the page says so too:
  the model takes a plain script with no per-line direction, so the delivery
  notes from Performance & Blocking cannot be passed to it. A read-through
  tells you how the scene sounds and how long it runs. It is not per-shot
  audio, and it is not a performance directed line by line.
*/

const styles = `
  .rec-wrap { max-width: 900px; margin: 0 auto; padding: 0 48px; }
  .rec-lede { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--muted); line-height: 2; margin-top: 22px; max-width: 64ch; }
  .rec-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; color: var(--accent); text-transform: uppercase; margin: 30px 0 10px; }
  .rec-area { width: 100%; min-height: 220px; background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
    padding: 16px 18px; color: var(--text); font-family: 'DM Mono', monospace; font-size: 12.5px; line-height: 1.95; resize: vertical; }
  .rec-area:focus { outline: none; border-color: var(--accent); }
  .rec-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-top: 14px; }
  .rec-btn { background: none; border: 1px solid var(--accent); color: var(--accent); border-radius: 3px; padding: 10px 20px;
    font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.08em; cursor: pointer; }
  .rec-btn:hover:not(:disabled) { background: var(--bg); }
  .rec-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .rec-cast { border: 1px solid var(--border); border-radius: 8px; background: var(--surface); padding: 18px 20px; margin-top: 16px; }
  .rec-cast-row { display: flex; justify-content: space-between; gap: 14px; font-family: 'DM Mono', monospace; font-size: 11px;
    padding: 7px 0; border-bottom: 1px solid var(--border); }
  .rec-cast-row:last-child { border-bottom: none; }
  .rec-cast-name { color: var(--text); }
  .rec-cast-voice { color: var(--muted); text-align: right; }
  .rec-cast-voice.none { color: var(--amber, #E5B769); }
  .rec-warn { font-family: 'DM Mono', monospace; font-size: 11px; color: #E5B769; line-height: 1.85; margin-top: 14px; }
  .rec-err { font-family: 'DM Mono', monospace; font-size: 11px; color: #F87171; line-height: 1.85; margin-top: 14px; }
  .rec-note { border-left: 2px solid var(--border); padding-left: 16px; font-family: 'DM Mono', monospace;
    font-size: 11px; color: var(--muted); line-height: 1.9; max-width: 68ch; margin-top: 26px; }
  .rec-note b { color: var(--text); font-weight: 400; }
  .rec-take { border: 1px solid var(--border); border-radius: 8px; background: var(--surface); padding: 18px 20px; margin-top: 12px; }
  .rec-take-top { display: flex; justify-content: space-between; gap: 14px; font-family: 'DM Mono', monospace; font-size: 10px;
    letter-spacing: 0.08em; color: var(--muted); text-transform: uppercase; }
  .rec-audio { width: 100%; margin-top: 12px; }
  .rec-script { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.9;
    white-space: pre-wrap; margin-top: 12px; max-height: 190px; overflow: auto; }
  @media (max-width: 720px) { .rec-wrap { padding: 0 22px; } }
`;

const EXAMPLE = `RUTH: You said you would be here at seven.
DANIEL: I was. I waited outside.
DANIEL: For an hour.
RUTH: Don't.`;

export default function RecordingStudioPage({ user, activeProject, notify, onSignInClick, setPage }) {
  const [dialogue, setDialogue] = useState("");
  const [voices, setVoices] = useState(new Map());
  const [takes, setTakes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [urls, setUrls] = useState({});
  const [reload, setReload] = useState(0);
  const asked = useRef(new Set());

  /* The creator's own Vault voices, so the cast can be shown before pressing. */
  useEffect(() => {
    let live = true;
    (async () => {
      if (!user?.id) { if (live) setVoices(new Map()); return; }
      const { data } = await supabase
        .from("vault_entries")
        .select("name, voice_preset, voice_sample_url")
        .eq("user_id", user.id)
        .eq("kind", "character");
      if (!live) return;
      const m = new Map();
      for (const row of data ?? []) {
        const key = String(row.name ?? "").trim().toLowerCase();
        if (key) m.set(key, row);
      }
      setVoices(m);
    })();
    return () => { live = false; };
  }, [user?.id]);

  const voiceFor = useMemo(() => (name) => {
    const row = voices.get(String(name ?? "").trim().toLowerCase());
    if (!row) return null;
    if (row.voice_sample_url) return { audio_url: row.voice_sample_url };
    if (row.voice_preset) return { preset: row.voice_preset };
    return null;
  }, [voices]);

  /* The same builder the server runs, so nothing is a surprise. */
  const built = useMemo(
    () => (dialogue.trim() ? buildScriptFromDialogue(dialogue, voiceFor) : null),
    [dialogue, voiceFor],
  );

  const cast = useMemo(() => {
    if (!built || built.error) return [];
    return built.names.map((name) => {
      const row = voices.get(String(name).trim().toLowerCase());
      return {
        name,
        voice: row?.voice_sample_url ? "a sample of your own" : (row?.voice_preset ?? null),
        fromVault: !!row,
      };
    });
  }, [built, voices]);

  const unvoiced = cast.filter((c) => !c.voice);

  /*
    Load the takes, and keep looking while any are still being read.

    One self-scheduling effect rather than an interval: a setInterval has to be
    cleared from three places and leaks if any of them is missed, and calling
    an outside async function from an effect body is what the React rules flag
    as a cascading render. Everything the effect needs is inside it, and
    `reload` is bumped after recording to run it again.
  */
  useEffect(() => {
    let live = true;
    let timer = null;
    const run = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("voice_takes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8);
      if (!live) return;
      const rows = data ?? [];
      setTakes(rows);
      const waiting = rows.some((t) => t.status === "queued" || t.status === "processing");
      if (waiting) timer = setTimeout(run, 4000);
    };
    void run();
    return () => { live = false; if (timer) clearTimeout(timer); };
  }, [user?.id, reload]);

  /*
    Audio lives in a private bucket, so playback needs a signed link. Asked for
    once per take: the ids already requested live in a ref rather than in state,
    because putting them in state would make this effect retrigger itself.
  */
  useEffect(() => {
    let live = true;
    (async () => {
      for (const take of takes) {
        if (take.status !== "complete" || asked.current.has(take.id)) continue;
        asked.current.add(take.id);
        try {
          const { data: sess } = await supabase.auth.getSession();
          const r = await fetch("/api/get-video-url", {
            method: "POST",
            headers: { Authorization: "Bearer " + sess?.session?.access_token, "Content-Type": "application/json" },
            body: JSON.stringify({ type: "voice", id: take.id }),
          });
          const j = await r.json().catch(() => ({}));
          if (live && r.ok && j.url) setUrls((prev) => (prev[take.id] ? prev : { ...prev, [take.id]: j.url }));
        } catch {
          // Leave it unplayable rather than breaking the list, and allow a
          // later pass to try again.
          asked.current.delete(take.id);
        }
      }
    })();
    return () => { live = false; };
  }, [takes]);

  async function record() {
    if (!user?.id) { onSignInClick?.(); return; }
    if (!built || built.error) return;
    setBusy(true); setError(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const r = await fetch("/api/record-scene", {
        method: "POST",
        headers: { Authorization: "Bearer " + sess?.session?.access_token, "Content-Type": "application/json" },
        body: JSON.stringify({ dialogue, projectId: activeProject?.id ?? null }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setError(j.error || "Could not start the read."); setBusy(false); return; }
      notify?.(`Reading ${j.lineCount} ${j.lineCount === 1 ? "line" : "lines"} — ${j.cost} ${j.cost === 1 ? "credit" : "credits"}.`);
      setReload((n) => n + 1);
    } catch {
      setError("Could not reach the recording studio.");
    }
    setBusy(false);
  }

  const cost = built && !built.error ? costOf(built.chars) : 0;

  return (
    <div className="page">
      <style>{styles}</style>
      <div className="rec-wrap">
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase" }}>
          Voice · scene read-through
        </div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 42, fontWeight: 700, color: "var(--text)", lineHeight: 1.08, margin: "14px 0 0", letterSpacing: "-0.01em" }}>
          Recording Studio
        </h1>
        <p className="rec-lede">
          Hear the scene read in your characters&apos; own voices before you generate a frame of it.
          A voice set on a character in the Vault is used every time they speak, the same way their
          locked description is — so they sound like themselves from scene to scene.
        </p>

        <div className="rec-label">The dialogue</div>
        <textarea
          className="rec-area"
          value={dialogue}
          onChange={(e) => setDialogue(e.target.value)}
          spellCheck={false}
          placeholder={EXAMPLE}
        />
        <div className="rec-row">
          <button className="rec-btn" type="button" disabled={busy || !built || !!built?.error} onClick={record}>
            {busy ? "Starting…" : user?.id ? `Record the scene · ${cost} ${cost === 1 ? "credit" : "credits"}` : "Sign in to record"}
          </button>
          {!dialogue.trim() && (
            <button className="rec-btn" type="button" style={{ borderColor: "var(--border)", color: "var(--muted)" }} onClick={() => setDialogue(EXAMPLE)}>
              Use an example
            </button>
          )}
          {built && !built.error && (
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em" }}>
              {built.lineCount} {built.lineCount === 1 ? "line" : "lines"} · {built.names.length} {built.names.length === 1 ? "voice" : "voices"} · {built.chars.toLocaleString()} characters
            </span>
          )}
        </div>

        {built?.error && <div className="rec-err">{built.error}</div>}
        {error && <div className="rec-err">{error}</div>}

        {cast.length > 0 && (
          <>
            <div className="rec-label">The cast</div>
            <div className="rec-cast">
              {cast.map((c) => (
                <div className="rec-cast-row" key={c.name}>
                  <span className="rec-cast-name">{c.name}</span>
                  <span className={"rec-cast-voice" + (c.voice ? "" : " none")}>
                    {c.voice
                      ? c.voice.replace(" [EN]", "")
                      : c.fromVault ? "no voice set — read by a stand-in" : "not in your Vault — read by a stand-in"}
                  </span>
                </div>
              ))}
            </div>
            {unvoiced.length > 0 && (
              <div className="rec-warn">
                {unvoiced.length === 1 ? `${unvoiced[0].name} has` : `${unvoiced.map((c) => c.name).join(", ")} have`}
                {" "}no voice yet, so the read uses a default one.{" "}
                <button
                  type="button"
                  onClick={() => setPage?.("vault")}
                  style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", cursor: "pointer", font: "inherit", textDecoration: "underline" }}
                >
                  Set a voice in the Vault
                </button>
                {" "}and it is used from then on. Voices available: {plainPresets().map((v) => v.replace(" [EN]", "")).join(", ")}.
              </div>
            )}
          </>
        )}

        <p className="rec-note">
          <b>What a read-through is, and is not.</b> The model reads a plain script, so the delivery
          notes from Performance &amp; Blocking cannot be handed to it — a parenthetical would simply
          be read out loud. This tells you how the scene sounds, how long it runs and where it drags.
          It is one audio file for the whole scene rather than a clip per shot, so it is a reference
          performance, not the audio you lip-sync a single shot to. Four voices at most in one read.
        </p>

        {takes.length > 0 && (
          <>
            <div className="rec-label">Your reads</div>
            {takes.map((t) => (
              <div className="rec-take" key={t.id}>
                <div className="rec-take-top">
                  <span>{(t.speaker_names ?? []).join(" · ") || "—"}</span>
                  <span>
                    {t.status === "complete"
                      ? `${t.duration_seconds ? Number(t.duration_seconds).toFixed(1) + "s · " : ""}${t.credits_spent} ${t.credits_spent === 1 ? "credit" : "credits"}`
                      : t.status === "failed" ? "Failed — credits refunded" : "Reading…"}
                  </span>
                </div>
                {t.status === "failed" && t.error_message && <div className="rec-err">{t.error_message}</div>}
                {t.status === "complete" && urls[t.id] && (
                  <audio className="rec-audio" controls preload="none" src={urls[t.id]} />
                )}
                {t.script && <div className="rec-script">{t.script}</div>}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
