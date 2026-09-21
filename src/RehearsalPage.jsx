import RehearsalStudio from "./RehearsalStudio.jsx";

/*
  RehearsalPage — RevaultAI
  Rehearse the scene before generating it: who moves where, when, and what
  each camera sees. Nothing here costs credits.
*/

export default function RehearsalPage({ rehearsalSeed }) {
  return (
    <div className="page">
      <div className="page-hdr">
        <div className="page-hdr-eyebrow">Rehearsal</div>
        <div className="page-hdr-title">Rehearsal Studio</div>
        <div className="page-hdr-sub">Block the scene over time before you spend a credit on it.</div>
      </div>
      <section className="section">
        <div style={{ maxWidth: 980, margin: "0 auto 22px", padding: "0 48px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--muted)", lineHeight: 1.85 }}>
          Scrub to a moment and drag anyone — a keyframe is written there, and the movement between keyframes is filled in. Mark beats as you go. Add cameras to compare angles on an identical performance. Shot size, lens, eyelines and the 180° line all update live.
        </div>
        <RehearsalStudio initial={rehearsalSeed ?? null} />
      </section>
    </div>
  );
}