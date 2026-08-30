import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  DiscoveredPage — RevaultAI
  Editorially curated AI films from around the web, embedded from their
  directors' own YouTube channels with full attribution. Managed via the
  discovered_films table in Supabase. Click-to-play facade: thumbnails render
  first, the iframe loads only when a film is played (keeps the page fast).
*/

export default function DiscoveredPage() {
  const [films, setFilms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(null); // id of the film currently playing

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("discovered_films")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) console.warn("[RevaultAI] Could not load discovered films:", error.message);
      setFilms(data ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="page">
      <style>{`
        .dv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
        .dv-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; transition: border-color 0.25s; }
        .dv-card:hover { border-color: var(--border-hover); }
        .dv-player { position: relative; width: 100%; aspect-ratio: 16/9; background: #000; cursor: pointer; }
        .dv-player img { width: 100%; height: 100%; object-fit: cover; display: block; filter: brightness(0.82); transition: filter 0.25s; }
        .dv-player:hover img { filter: brightness(1); }
        .dv-play { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
        .dv-play span { width: 62px; height: 62px; border-radius: 50%; background: rgba(14,15,20,0.75); border: 1px solid rgba(255,255,255,0.25); display: flex; align-items: center; justify-content: center; color: var(--text); font-size: 18px; padding-left: 4px; backdrop-filter: blur(4px); }
        .dv-player iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
        .dv-body { padding: 22px 24px; }
        .dv-award { display: inline-block; font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent); border: 1px solid rgba(123,63,228,0.35); border-radius: 3px; padding: 4px 10px; margin-bottom: 12px; }
        .dv-title { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
        .dv-director { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); letter-spacing: 0.06em; margin-bottom: 12px; }
        .dv-director a { color: var(--accent); text-decoration: none; }
        .dv-director a:hover { text-decoration: underline; }
        .dv-note { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.8; }
        .dv-intro { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--muted); line-height: 1.95; max-width: 620px; margin-bottom: 40px; }
        .dv-actions { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; }
        .dv-actions a { color: var(--muted); text-decoration: none; }
        .dv-actions a:hover { color: var(--accent); }
        .dv-dot { color: var(--muted); margin: 0 8px; }
        @media (max-width: 860px) { .dv-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div className="page-hdr">
        <div className="page-hdr-eyebrow">Curated From the Web</div>
        <div className="page-hdr-title">Discovered</div>
        <div className="page-hdr-sub">Exceptional AI films, wherever they live.</div>
      </div>

      <section className="section">
        <div className="dv-intro">
          Not every great AI film starts here — but the best ones deserve a place here anyway.
          Discovered is our standing exhibition of remarkable AI filmmaking from around the web,
          shown with full credit and streaming from each director's own channel. Every film is
          hand-picked. If you think yours belongs, write to rich@revaultai.com.
        </div>

        {loading ? (
          <div className="empty-state"><div className="empty-text">Loading films...</div></div>
        ) : films.length === 0 ? (
          <div className="empty-state"><div className="empty-text">The first films are being selected now.</div></div>
        ) : (
          <div className="dv-grid">
            {films.map((f) => (
              <div className="dv-card" key={f.id}>
                <div className="dv-player" onClick={() => setPlaying(f.id)}>
                  {playing === f.id ? (
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${f.youtube_id}?rel=0&modestbranding=1&autoplay=1`}
                      title={f.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  ) : (
                    <>
                      <img
                        src={`https://i.ytimg.com/vi/${f.youtube_id}/maxresdefault.jpg`}
                        alt={f.title}
                        onError={(e) => {
                          if (!e.target.dataset.fellBack) {
                            e.target.dataset.fellBack = "1";
                            e.target.src = `https://i.ytimg.com/vi/${f.youtube_id}/hqdefault.jpg`;
                          }
                        }}
                      />
                      <div className="dv-play"><span>&#9654;</span></div>
                    </>
                  )}
                </div>
                <div className="dv-body">
                  {f.award && <div className="dv-award">{f.award}</div>}
                  <div className="dv-title">{f.title}</div>
                  <div className="dv-director">
                    Directed by {f.director_url
                      ? <a href={f.director_url} target="_blank" rel="noopener noreferrer">{f.director_name}</a>
                      : f.director_name}
                  </div>
                  {f.note && <div className="dv-note">{f.note}</div>}
                  <div className="dv-actions">
                    <a href={`mailto:rich@revaultai.com?subject=${encodeURIComponent(`Claiming my film: ${f.title}`)}&body=${encodeURIComponent(`Hi Richard,\n\n"${f.title}" is my film and I'd like to claim it on RevaultAI.\n\n`)}`}>Is this your film? Claim it</a>
                    <span className="dv-dot">&middot;</span>
                    <a href={`mailto:rich@revaultai.com?subject=${encodeURIComponent(`Removal request: ${f.title}`)}&body=${encodeURIComponent(`Hi Richard,\n\nPlease remove "${f.title}" from the Discovered section.\n\n`)}`}>Request removal</a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}