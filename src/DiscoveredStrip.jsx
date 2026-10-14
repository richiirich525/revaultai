import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase.js";

/*
  DiscoveredStrip — RevaultAI
  A strip of hand-picked films found elsewhere on the web.
*/

export default function DiscoveredStrip({ setPage }) {
  const [films, setFilms] = useState([]);
  useEffect(() => {
    let canceled = false;
    (async () => {
      const { data } = await supabase
        .from("discovered_films")
        .select("id, title, youtube_id, director_name")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(4);
      if (!canceled) setFilms(data ?? []);
    })();
    return () => { canceled = true; };
  }, []);

  if (films.length === 0) return null;

  return (
    <section className="section">
      <div className="section-header"><div><div className="section-label" style={{ cursor: "pointer" }} onClick={() => setPage("discovered")}>Discovered</div><div className="section-sublabel">Exceptional AI films from around the web.</div></div><span className="section-link" onClick={() => setPage("discovered")}>View All &rarr;</span></div>
      <div className="creation-grid">
        {films.map((f) => (
          <div key={f.id} className="creation-card" onClick={() => setPage("discovered")} style={{ cursor: "pointer" }}>
            <div className="creation-thumb" style={{ position: "relative", overflow: "hidden" }}>
              <img
                src={`https://i.ytimg.com/vi/${f.youtube_id}/maxresdefault.jpg`}
                alt={f.title}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                onError={(e) => { if (!e.target.dataset.fellBack) { e.target.dataset.fellBack = "1"; e.target.src = `https://i.ytimg.com/vi/${f.youtube_id}/hqdefault.jpg`; } }}
              />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(14,15,20,0.7)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text)", fontSize: 15, paddingLeft: 3 }}>&#9654;</span>
              </div>
            </div>
            <div style={{ padding: "14px 16px" }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em" }}>Directed by {f.director_name}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
