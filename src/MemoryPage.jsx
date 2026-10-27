import { useState, useRef, useEffect } from "react";
import { supabase } from "./lib/supabase.js";
import { GENRES } from "./lib/stylePresets.js";
import { DAY_SECONDS } from "./lib/dayScene.js";

/*
  Memory Cinema — a film of a day you actually had.

  A day is a draft until you film it. That is the product, and it is a
  decision rather than a limitation: a job that filmed every day overnight
  would eventually render the worst day of somebody's year while they slept.
  Here the cost is visible, the day sits there until you want it, and a day
  you would rather not keep is a day you simply never film.

  The note does the work. Photos say where you were; only the words say what
  the day was. A picture of a parking structure and a picture of a hospital
  corridor are the same afternoon as a triumph or a catastrophe, and nothing
  in the image tells you which.

  Other people appear only if they built their own character and handed you a
  standing pass. Everybody else stays in the writing, which films as a person
  with no reference photo behind them — a description, not a likeness. The
  pass is re-checked on the server at the moment of filming, so what is shown
  here is a convenience and never the authority.
*/

const css = `
  .mem { max-width: 880px; margin: 0 auto; padding: 48px 20px 96px; }
  .mem-h { font-family: 'Syne', sans-serif; font-size: clamp(32px, 6vw, 52px);
    font-weight: 800; letter-spacing: -0.02em; line-height: 1.05; }
  .mem-sub { font-family: var(--font-body); font-size: 16px; color: var(--muted);
    line-height: 1.7; margin-top: 12px; max-width: 54ch; }
  .mem-label { font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.18em;
    text-transform: uppercase; color: var(--accent-text); margin-top: 36px; }
  .mem-note { width: 100%; min-height: 96px; margin-top: 14px; resize: vertical;
    font-family: var(--font-body); font-size: 16px; line-height: 1.6; color: var(--text);
    background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
    padding: 14px 16px; }
  .mem-note:focus { outline: none; border-color: var(--accent); }
  .mem-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
    gap: 12px; margin-top: 16px; }
  .mem-opt { text-align: left; border: 1px solid var(--border); border-radius: 10px;
    padding: 14px; background: var(--surface); cursor: pointer; color: var(--text);
    transition: border-color 0.2s; }
  .mem-opt:hover { border-color: var(--accent); }
  .mem-opt[data-on="1"] { border-color: var(--accent); }
  .mem-opt-l { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; }
  .mem-opt-n { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted);
    line-height: 1.6; margin-top: 5px; }
  .mem-shots { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px; margin-top: 16px; }
  .mem-shot { border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
    background: var(--surface); }
  .mem-shot img { width: 100%; display: block; aspect-ratio: 4/3; object-fit: cover; }
  .mem-shot figcaption { font-family: 'DM Mono', monospace; font-size: 10px;
    color: var(--muted); padding: 7px 9px; line-height: 1.5; }
  .mem-drop { margin-top: 16px; border: 1px dashed var(--border); border-radius: 12px;
    padding: 28px 24px; text-align: center; background: var(--surface); cursor: pointer; }
  .mem-drop:hover { border-color: var(--accent); }
  .mem-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 22px; align-items: center; }
  .mem-err { font-family: 'DM Mono', monospace; font-size: 13px; color: #E5B769;
    line-height: 1.75; margin-top: 18px; max-width: 60ch; }
  .mem-field { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--muted);
    line-height: 1.75; margin-top: 10px; }
  .mem-field b { color: var(--text); font-weight: 600; }
  .mem-date { font-family: 'DM Mono', monospace; font-size: 13px; color: var(--text);
    background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
    padding: 8px 10px; }
  @media (pointer: coarse) { .mem-opt, .mem-drop { min-height: 44px; } }
`;

const mono = { fontFamily: "'DM Mono', monospace" };
const MAX_PHOTOS = 6;

function today() {
  /* The person's own day, not UTC's. A film of "yesterday" that appears
     because a server is eight hours ahead is a small thing that makes the
     whole feature feel broken. */
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      resolve({ base64: dataUrl.split(",")[1] ?? "", dataUrl });
    };
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

export default function MemoryPage({ user, setPage, notify, onSignInClick }) {
  const [date, setDate] = useState(today);
  const [day, setDay] = useState(null);
  const [note, setNote] = useState("");
  const [styleId, setStyleId] = useState(null);
  const [packId, setPackId] = useState(null);
  const [withMe, setWithMe] = useState([]);
  const [mine, setMine] = useState([]);
  const [castable, setCastable] = useState([]);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [grantLink, setGrantLink] = useState(null);
  /* Signed, temporary links for the day's photos. Kept apart from `day` so
     the stored carrier form in state is never confused for a viewable one. */
  const [shots, setShots] = useState([]);
  const [grant, setGrant] = useState(null);
  const fileRef = useRef(null);

  const grantId = new URLSearchParams(window.location.search).get("grant");

  async function authToken() {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? null;
  }

  /* Somebody opened a request link. This is the only screen a person who has
     never used Memory Cinema will see, so it says what is being asked for
     and what it does not include. */
  useEffect(() => {
    if (!grantId) return;
    let live = true;
    (async () => {
      try {
        const res = await fetch("/api/memory-grant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ grantId }),
        });
        const body = await res.json().catch(() => ({}));
        if (!live) return;
        if (!res.ok) setError(body.error || "That request could not be opened.");
        else setGrant(body);
      } catch {
        if (live) setError("That request could not be opened.");
      }
    })();
    return () => { live = false; };
  }, [grantId]);

  /* The person's own characters, and the ones other people have handed them.
     RLS scopes the first; castable_names reads auth.uid() itself and returns
     names only, never descriptions and never images. */
  useEffect(() => {
    if (!user) return;
    let live = true;
    (async () => {
      const [own, lent] = await Promise.all([
        supabase.from("vault_entries").select("id, name, images")
          .eq("kind", "character").order("created_at", { ascending: false }).limit(12),
        supabase.rpc("castable_names"),
      ]);
      if (!live) return;
      setMine((own.data ?? []).filter((r) => Array.isArray(r.images) && r.images.length));
      setCastable(lent.data ?? []);
    })();
    return () => { live = false; };
  }, [user]);

  /* The day being edited. A day is read straight from the table because
     row-level security already scopes it to its owner — a server hop would
     add latency and no safety. */
  useEffect(() => {
    if (!user || grantId) return;
    let live = true;
    (async () => {
      const { data } = await supabase
        .from("memory_days")
        .select("id, day, note, photos, style_id, pack_id, cast_packs, status, generation_id")
        .eq("day", date).maybeSingle();
      if (!live) return;
      setDay(data ?? null);
      setNote(data?.note ?? "");
      setStyleId(data?.style_id ?? null);
      setPackId(data?.pack_id ?? null);
      setWithMe(Array.isArray(data?.cast_packs) ? data.cast_packs : []);
    })();
    return () => { live = false; };
  }, [user, date, grantId]);

  /*
    A photo's stored link records where the object lives in a private bucket,
    so it is not something a browser can load. Every read path in this app
    turns that back into a key and presigns it; this is that call for a day.
    Re-run whenever the photo list changes, including right after adding one.
  */
  useEffect(() => {
    const id = day?.id;
    const count = day?.photos?.length ?? 0;
    if (!user || !id || !count) { return; }
    let live = true;
    (async () => {
      try {
        const t = await authToken();
        const res = await fetch("/api/get-video-url", {
          method: "POST",
          headers: { "content-type": "application/json", Authorization: "Bearer " + t },
          body: JSON.stringify({ type: "memory-day", id }),
        });
        const body = await res.json().catch(() => ({}));
        if (live && res.ok) setShots(body.photos ?? []);
      } catch { /* the captions still render; a retry comes with the next change */ }
    })();
    return () => { live = false; };
  }, [user, day?.id, day?.photos?.length]);

  async function saveDay(patch) {
    if (!user) { onSignInClick?.(); return null; }
    setError(null);
    const row = {
      user_id: user.id,
      day: date,
      note: patch.note ?? note,
      style_id: patch.styleId ?? styleId,
      pack_id: patch.packId ?? packId,
      cast_packs: patch.withMe ?? withMe,
      updated_at: new Date().toISOString(),
    };
    const { data, error: writeError } = await supabase
      .from("memory_days").upsert(row, { onConflict: "user_id,day" })
      .select("id, day, note, photos, style_id, pack_id, cast_packs, status").single();
    if (writeError) { setError("Could not save that day: " + writeError.message); return null; }
    setDay(data);
    return data;
  }

  async function addPhotos(files) {
    const list = [...(files ?? [])].filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type));
    if (!list.length) { setError("Those need to be JPEG, PNG or WebP photos."); return; }
    if (!user) { onSignInClick?.(); return; }
    const room = MAX_PHOTOS - (day?.photos?.length ?? 0);
    if (room <= 0) { setError(`A day holds ${MAX_PHOTOS} photos.`); return; }

    setError(null);
    setBusy("photos");
    try {
      await saveDay({});
      const payload = [];
      for (const f of list.slice(0, room)) {
        const { base64 } = await readFile(f);
        payload.push({ image: base64, mediaType: f.type });
      }
      const t = await authToken();
      const res = await fetch("/api/memory-day", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: "Bearer " + t },
        body: JSON.stringify({ day: date, photos: payload }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error || "We could not use those photos.");
      else setDay((d) => ({ ...(d ?? {}), ...body.day }));
    } catch (err) {
      setError(err.message || "Something went wrong adding those photos.");
    }
    setBusy(null);
  }

  async function film() {
    if (!user) { onSignInClick?.(); return; }
    setError(null);
    setBusy("film");
    try {
      const saved = await saveDay({});
      if (!saved) { setBusy(null); return; }
      const t = await authToken();
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: "Bearer " + t },
        body: JSON.stringify({
          model: "seedance-2.5",
          duration: DAY_SECONDS,
          aspectRatio: "16:9",
          prompt: "memory",
          cast: { dayId: saved.id },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error || "We could not film that day.");
      else {
        notify?.("Filming — it appears on your Takes page when it is done.");
        setPage?.("takes");
      }
    } catch (err) {
      setError(err.message || "Something went wrong filming that day.");
    }
    setBusy(null);
  }

  async function askSomebody() {
    if (!user) { onSignInClick?.(); return; }
    setError(null);
    setBusy("ask");
    try {
      const t = await authToken();
      const res = await fetch("/api/memory-grant", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: "Bearer " + t },
        body: JSON.stringify({}),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error || "We could not start that request.");
      else setGrantLink(`${window.location.origin}/memory?grant=${body.grantId}`);
    } catch (err) {
      setError(err.message || "We could not start that request.");
    }
    setBusy(null);
  }

  async function acceptGrant(pid) {
    if (!user) { onSignInClick?.(); return; }
    setError(null);
    setBusy("accept");
    try {
      const t = await authToken();
      const res = await fetch("/api/memory-grant", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: "Bearer " + t },
        body: JSON.stringify({ grantId, packId: pid }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error || "We could not record that.");
      else setGrant((g) => ({ ...(g ?? {}), status: "live", mine: body.name }));
    } catch (err) {
      setError(err.message || "We could not record that.");
    }
    setBusy(null);
  }

  /*
    The stored list decides how many photos there are and what each one was
    read for; the signed list decides which can actually be displayed. Keeping
    them paired by position means the count and the captions are right from
    the first render, and nothing ever renders a link that cannot load.
  */
  const photos = (day?.photos ?? []).map((p, i) => ({ ...p, viewUrl: shots[i]?.url ?? null }));
  const filmed = day?.status === "filmed";
  const ready = !!note.trim() && !!packId && !!styleId;

  /* ---- somebody else's request ---------------------------------------- */
  if (grantId) {
    return (
      <div className="mem">
        <style>{css}</style>
        {!grant && !error && <p className="mem-sub">Opening that request&hellip;</p>}
        {grant && (
          <>
            <h1 className="mem-h">
              {grant.status === "live"
                ? "Done. You are in."
                : `${grant.askerName} wants you in their films.`}
            </h1>
            <p className="mem-sub">
              {grant.status === "live"
                ? `${grant.askerName} can cast ${grant.mine ?? "your character"} in days they film. You can withdraw it whenever you like, and it lapses on its own in two weeks.`
                : `They are asking to cast one of your characters in films of their own days — the real ones, as they happen. You pick which character. They never get your photos, they cannot change it, and you can take it back at any time.`}
            </p>

            {grant.status === "expired" && <p className="mem-sub">That request has expired.</p>}
            {grant.status === "revoked" && <p className="mem-sub">That request was withdrawn.</p>}

            {grant.status === "pending" && user && mine.length > 0 && (
              <>
                <div className="mem-label">Which character</div>
                <div className="mem-grid">
                  {mine.map((m) => (
                    <button key={m.id} className="mem-opt" type="button" disabled={busy === "accept"}
                      onClick={() => acceptGrant(m.id)}>
                      <div className="mem-opt-l">{m.name}</div>
                      <div className="mem-opt-n">{busy === "accept" ? "Recording…" : "Let them cast this one"}</div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {grant.status === "pending" && user && mine.length === 0 && (
              <div className="mem-row">
                <button className="gen-button" type="button" onClick={() => setPage?.("cast")}>
                  Build a character first
                </button>
              </div>
            )}

            {grant.status === "pending" && !user && (
              <div className="mem-row">
                <button className="gen-button" type="button" onClick={() => onSignInClick?.()}>
                  Sign in to answer
                </button>
              </div>
            )}
          </>
        )}
        {error && <p className="mem-err">{error}</p>}
      </div>
    );
  }

  /* ---- your own day ---------------------------------------------------- */
  return (
    <div className="mem">
      <style>{css}</style>

      <h1 className="mem-h">What happened today?</h1>
      <p className="mem-sub">
        Write a line about the day and drop in a few photos. It stays a draft until
        you decide to film it &mdash; nothing renders on its own, and nothing is charged
        until you ask for it.
      </p>

      <div className="mem-row">
        <input className="mem-date" type="date" value={date} max={today()}
          aria-label="Which day" onChange={(e) => setDate(e.target.value)} />
        {filmed && <span style={{ ...mono, fontSize: 12, color: "var(--muted)" }}>Already filmed</span>}
      </div>

      {!user && (
        <div className="mem-row">
          <button className="gen-button" type="button" onClick={() => onSignInClick?.()}>
            Sign in to keep days
          </button>
        </div>
      )}

      <div className="mem-label">The day, in a line</div>
      <textarea
        className="mem-note"
        value={note}
        disabled={filmed}
        maxLength={600}
        placeholder="Drove to Ojai and the car overheated on the grade."
        aria-label="What happened today"
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => user && note !== (day?.note ?? "") && saveDay({})}
      />
      <div style={{ ...mono, fontSize: 11, color: "var(--muted)", marginTop: 8, lineHeight: 1.7 }}>
        This is the part that matters. The photos say where you were; only this says
        what the day actually was.
      </div>

      <div className="mem-label">Photos ({photos.length} of {MAX_PHOTOS})</div>
      {photos.length > 0 && (
        <div className="mem-shots">
          {photos.map((p, i) => (
            <figure key={p.url ?? i} className="mem-shot" style={{ margin: 0 }}>
              {p.viewUrl
                ? <img src={p.viewUrl} alt={p.read?.setting || "A photo from the day"} />
                : <div style={{ aspectRatio: "4/3", background: "var(--bg2, var(--surface))" }} />}
              <figcaption>{p.read?.setting || "Read for setting"}</figcaption>
            </figure>
          ))}
        </div>
      )}
      {!filmed && photos.length < MAX_PHOTOS && (
        <>
          <div className="mem-drop" role="button" tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addPhotos(e.dataTransfer.files); }}>
            <div style={{ ...mono, fontSize: 13, color: "var(--text)" }}>
              {busy === "photos" ? "Reading them…" : "Add photos from the day"}
            </div>
            <div style={{ ...mono, fontSize: 11, color: "var(--muted)", marginTop: 7, lineHeight: 1.7 }}>
              Read for where and when, never for faces.
            </div>
          </div>
          <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }} onChange={(e) => addPhotos(e.target.files)} />
        </>
      )}

      <div className="mem-label">Who plays you</div>
      {mine.length === 0 ? (
        <div className="mem-row">
          <button className="gen-button" type="button" onClick={() => setPage?.("cast")}>
            Build your character
          </button>
        </div>
      ) : (
        <div className="mem-grid">
          {mine.map((m) => (
            <button key={m.id} className="mem-opt" data-on={packId === m.id ? "1" : "0"}
              type="button" disabled={filmed}
              onClick={() => { setPackId(m.id); saveDay({ packId: m.id }); }}>
              <div className="mem-opt-l">{m.name}</div>
              <div className="mem-opt-n">{packId === m.id ? "In this day" : "Use this one"}</div>
            </button>
          ))}
        </div>
      )}

      <div className="mem-label">Who else</div>
      {castable.length === 0 ? (
        <>
          <p className="mem-sub">
            Nobody yet. Somebody appears in your films only if they built their own
            character and handed you a pass for it &mdash; which means asking them.
            Everyone else in the day stays in your writing, which films as a person
            with no photograph behind them.
          </p>
          <div className="mem-row">
            <button className="gen-button" type="button" disabled={busy === "ask"} onClick={askSomebody}>
              {busy === "ask" ? "Starting…" : "Ask somebody"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mem-grid">
            {castable.map((c) => {
              const on = withMe.includes(c.pack_id);
              return (
                <button key={c.pack_id} className="mem-opt" data-on={on ? "1" : "0"}
                  type="button" disabled={filmed}
                  onClick={() => {
                    const next = on ? withMe.filter((x) => x !== c.pack_id) : [...withMe, c.pack_id];
                    setWithMe(next);
                    saveDay({ withMe: next });
                  }}>
                  <div className="mem-opt-l">{c.name}</div>
                  <div className="mem-opt-n">{on ? "In this day" : "Was there too"}</div>
                </button>
              );
            })}
          </div>
          <div className="mem-row">
            <button className="btn-ghost" type="button" disabled={busy === "ask"} onClick={askSomebody}>
              Ask somebody else
            </button>
          </div>
        </>
      )}

      {grantLink && (
        <div className="mem-row">
          <input className="mem-date" readOnly value={grantLink} style={{ flex: 1, minWidth: 260 }}
            aria-label="Request link" onFocus={(e) => e.target.select()} />
          <button className="btn-ghost" type="button"
            onClick={() => { navigator.clipboard?.writeText(grantLink); notify?.("Link copied."); }}>
            Copy
          </button>
        </div>
      )}

      <div className="mem-label">How it looks</div>
      <div className="mem-grid">
        {GENRES.map((g) => (
          <button key={g.id} className="mem-opt" data-on={styleId === g.id ? "1" : "0"}
            type="button" disabled={filmed}
            onClick={() => { setStyleId(g.id); saveDay({ styleId: g.id }); }}>
            <div className="mem-opt-l">{g.label}</div>
            <div className="mem-opt-n">{g.note}</div>
          </button>
        ))}
      </div>

      {!filmed && (
        <div className="mem-row">
          <button className="gen-button" type="button" disabled={!ready || busy === "film"} onClick={film}>
            {busy === "film" ? "Starting…" : `Film this day (${DAY_SECONDS} seconds)`}
          </button>
          {!ready && (
            <span style={{ ...mono, fontSize: 11, color: "var(--muted)" }}>
              {!note.trim() ? "Needs a line about the day" : !packId ? "Needs a character" : "Needs a look"}
            </span>
          )}
        </div>
      )}

      {filmed && (
        <div className="mem-row">
          <button className="gen-button" type="button" onClick={() => setPage?.("takes")}>
            See it
          </button>
        </div>
      )}

      {error && <p className="mem-err">{error}</p>}
    </div>
  );
}
