import ScenePreview from "./ScenePreview.jsx";
import { GALLERY } from "./lib/galleryScenes.js";

/*
  SceneGallery — RevaultAI

  A shelf of rehearsed scenes past the ones you can start from, each one
  opening in the studio in a click.

  The thumbnails are not pictures. Each one is ScenePreview rendering that
  scene's own blocking from the same data the studio would load, so a
  thumbnail cannot drift from the scene it stands for and there is no image to
  keep in sync. They are drawn as the plan only — no 3D, no animation loop —
  because eight animated previews on one page is a frame budget spent on
  decoration.

  Every scene here is validated by scripts/check-starters.mjs alongside the
  starters: real keyframes, nobody walking through furniture, every camera
  framing somebody.
*/

const css = `
  .sg { margin-top: 44px; }
  .sg-h { font-family: 'DM Mono', monospace; font-size: 12px; letter-spacing: 0.2em;
    text-transform: uppercase; color: var(--accent-text); margin-bottom: 6px; }
  .sg-sub { font-family: var(--font-body); font-size: 13.5px; color: var(--muted);
    line-height: 1.8; max-width: 64ch; margin-bottom: 18px; }
  .sg-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; }
  .sg-card { text-align: left; background: var(--surface); border: 1px solid var(--border);
    border-radius: 8px; padding: 0; overflow: hidden; cursor: pointer; color: var(--text);
    transition: border-color 0.2s; display: flex; flex-direction: column; }
  .sg-card:hover { border-color: var(--accent); }
  .sg-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .sg-shot { background: #0E0F14; border-bottom: 1px solid var(--border); }
  .sg-body { padding: 13px 15px 15px; }
  .sg-name { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; }
  .sg-note { font-family: var(--font-body); font-size: 13px; color: var(--muted);
    line-height: 1.65; margin-top: 6px; }
  .sg-meta { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--accent-text);
    margin-top: 9px; letter-spacing: 0.04em; }
  @media (pointer: coarse) { .sg-card { min-height: 44px; } }
`;

export default function SceneGallery({ onOpen }) {
  return (
    <div className="sg">
      <style>{css}</style>
      <div className="sg-h">More rehearsed scenes</div>
      <div className="sg-sub">
        Each one is blocked already, and each one is about a single idea — what the camera does,
        or what the performance does. Open any of them, take it apart, and keep whatever is
        useful. Nothing here costs a credit.
      </div>
      <div className="sg-grid">
        {GALLERY.map((scene) => {
          const r = scene.make();
          const cams = r.cameras.length;
          return (
            <button
              key={scene.id}
              type="button"
              className="sg-card"
              onClick={() => onOpen?.(scene.id)}
              title={`Open "${scene.name}" in the studio`}
            >
              <div className="sg-shot">
                <ScenePreview rehearsal={r} sceneKey={scene.id} height={132} threeD={false} />
              </div>
              <div className="sg-body">
                <div className="sg-name">{scene.name} →</div>
                <div className="sg-note">{scene.note}</div>
                <div className="sg-meta">
                  {r.duration}s · {r.actors.length} performers · {cams} {cams === 1 ? "camera" : "cameras"} · {r.beats.length} beats
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
