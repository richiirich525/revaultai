/*
  HomeNew — RevaultAI

  What has been added lately, on the homepage, for the visitor who does not
  follow any of this anywhere else. Most people who land here have never seen
  a post about the site and have no way of knowing that the thing they would
  actually want was built last week.

  Adding an entry is one object in NEW, newest first. Keep it to six: a list
  longer than that stops being news and becomes a second features section,
  and the Journal and the changelog already exist for the full record.

  Dates are the point. "New" with no date is a claim that goes stale quietly
  and is still sitting there in March.
*/

const NEW = [
  {
    date: "2026-10-25",
    title: "Memory Cinema",
    body: "Write a line about your day, drop in a few photos, and film it as the genre you pick. It stays a draft until you ask for it.",
    page: "memory",
    cta: "Film a day",
  },
  {
    date: "2026-10-25",
    title: "Several angles, from your phone",
    body: "Open a capture on your laptop, shoot the angles on your phone. More angles means your face holds up when the camera moves.",
    page: "cast",
    cta: "Try a capture",
  },
  {
    date: "2026-10-25",
    title: "Scenes with other people",
    body: "Send a link and somebody lands in the same shot — with their own photo, or with a character they already have.",
    page: "cast",
    cta: "Open a scene",
  },
  {
    date: "2026-10-24",
    title: "Cast Yourself",
    body: "One photo becomes a character that stays you from shot to shot. Then put it in a scene: a genre, a beat, five seconds.",
    page: "cast",
    cta: "Be in the movie",
  },
  {
    date: "2026-10-24",
    title: "Animate Yourself",
    body: "The same character drawn as cel-shade, comic halftone, Sunday funnies, claymation, watercolor or pencil. Four free.",
    page: "animate",
    cta: "Draw yourself",
  },
  {
    date: "2026-10-22",
    title: "The Recording Studio",
    body: "A scene read aloud in your characters' own voices, cloned from a recording and locked in the Vault like their wardrobe.",
    page: "recording-studio",
    cta: "Hear a scene",
  },
];

/* Written out rather than computed, so the month never renders in a locale
   that turns 2026-10-25 into something nobody asked for. */
const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function pretty(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export default function HomeNew({ setPage }) {
  return (
    <section className="hn-wrap">
      <style>{`
        .hn-wrap { padding: 64px 48px; border-bottom: 1px solid var(--border); background: var(--bg); }
        .hn-inner { max-width: 1180px; margin: 0 auto; }
        .hn-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; flex-wrap: wrap; margin-bottom: 32px; }
        .hn-eyebrow { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.22em; color: var(--accent); text-transform: uppercase; margin-bottom: 12px; }
        .hn-title { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: clamp(28px, 3.4vw, 40px); color: var(--text); line-height: 1.15; }
        .hn-sub { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--muted); line-height: 1.9; max-width: 460px; margin-top: 8px; }
        .hn-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .hn-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 24px; display: flex; flex-direction: column; gap: 10px; transition: border-color 0.25s; }
        .hn-card:hover { border-color: var(--border-hover); }
        .hn-date { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.18em; color: var(--accent); text-transform: uppercase; }
        .hn-card h3 { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; color: var(--text); margin: 0; }
        .hn-card p { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.8; margin: 0; flex: 1; }
        .hn-link { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--accent-text, var(--accent)); background: none; border: none; padding: 0; text-align: left; cursor: pointer; align-self: flex-start; }
        .hn-link:hover { text-decoration: underline; }
        .hn-ctas { display: flex; gap: 14px; margin-top: 30px; flex-wrap: wrap; }
        @media (max-width: 900px) { .hn-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 600px) {
          .hn-wrap { padding: 44px 24px; }
          .hn-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="hn-inner">
        <div className="hn-head">
          <div>
            <div className="hn-eyebrow">Recently added</div>
            <div className="hn-title">What&rsquo;s New</div>
            <div className="hn-sub">
              The site changes most weeks. This is what showed up lately, with dates,
              so you can tell what is actually new.
            </div>
          </div>
        </div>

        <div className="hn-grid">
          {NEW.map((item) => (
            <div className="hn-card" key={item.date + item.title}>
              <div className="hn-date">{pretty(item.date)}</div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <button className="hn-link" type="button" onClick={() => setPage(item.page)}>
                {item.cta} &rarr;
              </button>
            </div>
          ))}
        </div>

        <div className="hn-ctas">
          <button className="btn-ghost" onClick={() => setPage("blog")}>Read the Journal</button>
          <button className="btn-ghost" onClick={() => setPage("tools")}>See everything</button>
        </div>
      </div>
    </section>
  );
}
