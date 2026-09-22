import { JOBS } from "./lib/toolCatalog.js";

/*
  CreateMenuItems — RevaultAI
  The Create menu, grouped into the same five jobs as the /tools page and
  read from the same list. Tools needing an account or credits appear once
  you're signed in. `hide` skips tools already shown elsewhere in the menu.
*/

const css = `
  .cm-jobs { display: grid; grid-template-columns: 1fr; gap: 2px 20px; }
  .cm-job { padding: 4px 0 8px; }
  .cm-job-name { font-family: 'DM Mono', monospace; font-size: 8px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent); padding: 8px 14px 4px; opacity: 0.9; }
  @media (min-width: 1000px) {
    .cm-jobs { grid-template-columns: repeat(5, minmax(150px, 1fr)); width: min(900px, 86vw); }
  }
`;

export default function CreateMenuItems({ page, go, itemStyle, user, hide = [] }) {
  return (
    <div className="cm-jobs">
      <style>{css}</style>
      {JOBS.map((j) => {
        const tools = j.tools.filter((t) => t.inMenu !== false && !hide.includes(t.name) && (t.access === "free" || user));
        if (!tools.length) return null;
        return (
          <div className="cm-job" key={j.id}>
            <div className="cm-job-name">{j.name}</div>
            {tools.map((t) => (
              <button key={t.name} style={itemStyle(page === t.page)} onClick={() => go(t.page)}>{t.name}</button>
            ))}
          </div>
        );
      })}
    </div>
  );
}