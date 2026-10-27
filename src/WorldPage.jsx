import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  WorldPage — RevaultAI

  A take that has been locked into a place, and the people in it.

  The capsule is read through world_capsule(id), a security-definer function,
  because world_capsules has no select policy at all: a world is reachable by
  its id and not otherwise, so nobody can browse a list of what has been
  locked. The id is the permission.

  The room streams. world-chat sends server-sent events — a token at a time,
  then a done — so a reply arrives as it is written rather than after a
  silence. The alternative is a spinner for ten seconds while somebody waits
  to find out whether anyone is home.
*/

const css = `
  .wd { max-width: 920px; margin: 0 auto; padding: 48px 20px 96px; }
  .wd-h { font-family: 'Syne', sans-serif; font-size: clamp(30px, 5vw, 46px); font-weight: 800; letter-spacing: -0.02em; line-height: 1.06; }
  .wd-sub { font-family: var(--font-body); font-size: 16px; color: var(--muted); line-height: 1.7; margin-top: 10px; max-width: 58ch; }
  .wd-label { font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent-text, var(--accent)); margin-top: 34px; }
  .wd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; margin-top: 14px; }
  .wd-who { text-align: left; border: 1px solid var(--border); border-radius: 10px; padding: 14px; background: var(--surface); color: var(--text); cursor: pointer; }
  .wd-who:hover { border-color: var(--accent); }
  .wd-who[data-on="1"] { border-color: var(--accent); }
  .wd-who-n { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; }
  .wd-who-d { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.6; margin-top: 5px; }
  .wd-field { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--muted); line-height: 1.8; margin-top: 12px; }
  .wd-field b { color: var(--text); font-weight: 600; }
  .wd-room { border: 1px solid var(--border); border-radius: 12px; background: var(--surface); margin-top: 16px; padding: 16px; }
  .wd-beat { font-family: var(--font-body); font-size: 15px; line-height: 1.7; margin-bottom: 12px; }
  .wd-beat b { font-family: 'Syne', sans-serif; font-weight: 700; }
  .wd-mine { color: var(--muted); }
  .wd-row { display: flex; gap: 10px; margin-top: 14px; }
  .wd-in { flex: 1; min-width: 0; background: var(--bg); border: 1px solid var(--border); border-radius: 9px; padding: 10px 12px; color: var(--text); font-family: var(--font-body); font-size: 15px; }
  .wd-in:focus { outline: none; border-color: var(--accent); }
  .wd-err { font-family: 'DM Mono', monospace; font-size: 12px; color: #E5B769; line-height: 1.75; margin-top: 14px; }
  .wd-thin { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.8; margin-top: 10px; }
`;

export default function WorldPage({ worldId, setPage, user, onSignInClick }) {
  const [world, setWorld] = useState(null);
  const [who, setWho] = useState(null);
  const [say, setSay] = useState("");
  const [beats, setBeats] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    if (!worldId) return;
    let live = true;
    (async () => {
      const { data, error: readError } = await supabase.rpc("world_capsule", { world_id: worldId });
      if (!live) return;
      if (readError) { setError("That world could not be opened: " + readError.message); return; }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) { setError("That world does not exist, or the link is wrong."); return; }
      setWorld(row);
      setBeats(Array.isArray(row.beats) ? row.beats : []);
      const first = (row.capsule?.cast ?? []).find((c) => c.description) ?? (row.capsule?.cast ?? [])[0];
      setWho(first?.name ?? null);
    })();
    return () => { live = false; };
  }, [worldId]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [beats.length]);

  /*
    One exchange, streamed. The person's own line goes on screen straight
    away and the reply fills in as it arrives; both are written to the room
    by the server, so what is on screen and what the room remembers come from
    the same place rather than being kept in step by hand.
  */
  async function send() {
    const line = say.trim();
    if (!line || !who) return;
    if (!user) { onSignInClick?.(); return; }
    setSay("");
    setError(null);
    setBusy(true);
    setBeats((b) => [...b, { speaker: null, text: line, kind: "said" }, { speaker: who, text: "", kind: "said" }]);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch("/api/world-chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: "Bearer " + sess?.session?.access_token,
        },
        body: JSON.stringify({ worldId, character: who, say: line }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Nobody answered.");
        setBeats((b) => b.slice(0, -1));
        setBusy(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let event = null;

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const raw of lines) {
          if (raw.startsWith("event: ")) { event = raw.slice(7).trim(); continue; }
          if (!raw.startsWith("data: ")) continue;
          let payload = {};
          try { payload = JSON.parse(raw.slice(6)); } catch { continue; }
          if (event === "token" && payload.t) {
            setBeats((b) => {
              const next = b.slice();
              next[next.length - 1] = { ...next[next.length - 1], text: next[next.length - 1].text + payload.t };
              return next;
            });
          } else if (event === "error") {
            setError(payload.error || "Nobody answered.");
          } else if (event === "warning") {
            setError(payload.warning);
          }
        }
      }
    } catch (err) {
      setError(err.message || "Nobody answered.");
    }
    setBusy(false);
  }

  if (error && !world) {
    return (
      <div className="wd">
        <style>{css}</style>
        <h1 className="wd-h">This world is closed.</h1>
        <p className="wd-sub">{error}</p>
        <div style={{ marginTop: 20 }}>
          <button className="gen-button" type="button" onClick={() => setPage?.("takes")}>Back to your takes</button>
        </div>
      </div>
    );
  }

  if (!world) {
    return <div className="wd"><style>{css}</style><p className="wd-sub">Opening&hellip;</p></div>;
  }

  const c = world.capsule ?? {};
  const cast = Array.isArray(c.cast) ? c.cast : [];

  return (
    <div className="wd">
      <style>{css}</style>

      <h1 className="wd-h">{world.title || c.title || "Untitled world"}</h1>
      {c.logline && <p className="wd-sub">{c.logline}</p>}

      <div className="wd-field">
        {c.set?.name && <div><b>Where</b> {c.set.name}</div>}
        {c.state?.text && <div><b>How things stand</b> {c.state.text}</div>}
        {c.look?.look && <div><b>Look</b> {c.look.look}</div>}
        {Array.isArray(c.props) && c.props.length > 0 && (
          <div><b>Within reach</b> {c.props.map((p) => p.name ?? p).join(", ")}</div>
        )}
      </div>

      {cast.length > 0 && (
        <>
          <div className="wd-label">Who is here</div>
          <div className="wd-grid">
            {cast.map((person) => (
              <button
                key={person.name}
                className="wd-who"
                data-on={who === person.name ? "1" : "0"}
                type="button"
                onClick={() => setWho(person.name)}
              >
                <div className="wd-who-n">{person.name}</div>
                <div className="wd-who-d">
                  {person.description || "Named in the take, not described."}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="wd-label">The room</div>
      <div className="wd-room">
        {beats.length === 0 && (
          <div className="wd-thin">
            Nothing has been said here yet. {who ? `Say something to ${who}.` : "Pick somebody first."}
          </div>
        )}
        {beats.map((beat, i) => (
          <div className={"wd-beat" + (beat.speaker ? "" : " wd-mine")} key={i}>
            <b>{beat.speaker ?? "You"}:</b> {beat.text}
            {busy && i === beats.length - 1 && beat.speaker && !beat.text && <span style={{ opacity: 0.5 }}>&hellip;</span>}
          </div>
        ))}
        <div ref={endRef} />

        <form className="wd-row" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input
            className="wd-in"
            value={say}
            maxLength={600}
            placeholder={who ? `Say something to ${who}` : "Pick somebody above"}
            aria-label="What you say"
            disabled={!who || busy}
            onChange={(e) => setSay(e.target.value)}
          />
          <button className="gen-button" type="submit" disabled={!who || busy || !say.trim()}>
            {busy ? "…" : "Say it"}
          </button>
        </form>
      </div>

      {error && <div className="wd-err">{error}</div>}

      <div className="wd-thin">
        This world was locked from a take. Lock it again after observing the footage and it
        picks up the real ending instead of the planned one.
      </div>
    </div>
  );
}
