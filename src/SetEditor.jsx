import { useState } from "react";
import { pieceGroups, prettyName, addPiece, turnPiece, movePiece, raisePiece, removePiece, resizeFloor } from "./lib/setEdit.js";

/*
  SetEditor — RevaultAI
  Dress a room: move, turn, add and remove furniture, resize the floor, then
  save it as your own set. A set is data, so your version of a kitchen is a
  couple of kilobytes and reusable across the whole film.
*/

const mono = { fontFamily: "'DM Mono', monospace" };
const btn = {
  background: "none", border: "1px solid var(--border)", color: "var(--muted)", borderRadius: 3,
  padding: "5px 9px", ...mono, fontSize: 10, letterSpacing: "0.06em", cursor: "pointer",
};
const on = { ...btn, borderColor: "var(--accent)", color: "var(--accent)" };

export default function SetEditor({ room, onChange, onSave, saved = [], onLoad, onDelete, selected, onSelect, saving }) {
  const [adding, setAdding] = useState(false);
  const [group, setGroup] = useState("Seating");
  if (!room) return null;

  const groups = pieceGroups();
  const items = [...(room.walls ?? []).map((w) => ({ ...w, structural: true })), ...(room.props ?? [])];
  const piece = items.find((p) => p.id === selected) ?? null;
  const nudge = (dx, dz) => onChange(movePiece(room, piece.id, (piece.x ?? 0) + dx, (piece.z ?? 0) + dz));

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "12px 14px", marginTop: 10, background: "var(--surface)" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <span style={{ ...mono, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent)" }}>Dress the set</span>
        <input
          value={room.name}
          onChange={(e) => onChange({ ...room, name: e.target.value.slice(0, 80) })}
          style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 3, padding: "5px 8px", ...mono, fontSize: 11, color: "var(--text)", minWidth: 190 }}
        />
        <button style={on} onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save as my set"}</button>
        <span style={{ ...mono, fontSize: 10, color: "var(--muted)" }}>Floor</span>
        <input type="number" step="0.5" min="2" max="14" value={room.floor.w}
          onChange={(e) => onChange(resizeFloor(room, Number(e.target.value), room.floor.d))}
          style={{ width: 54, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 3, padding: "4px 6px", ...mono, fontSize: 10, color: "var(--text)" }} />
        <span style={{ ...mono, fontSize: 10, color: "var(--muted)" }}>×</span>
        <input type="number" step="0.5" min="2" max="14" value={room.floor.d}
          onChange={(e) => onChange(resizeFloor(room, room.floor.w, Number(e.target.value)))}
          style={{ width: 54, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 3, padding: "4px 6px", ...mono, fontSize: 10, color: "var(--text)" }} />
        <span style={{ ...mono, fontSize: 10, color: "var(--muted)" }}>m</span>
      </div>

      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
        {items.map((p) => (
          <button key={p.id} style={selected === p.id ? on : btn} onClick={() => onSelect(selected === p.id ? null : p.id)}>
            {p.structural ? "▫ " : ""}{(p.label || prettyName(p.piece)).replace(/^the /, "")}
          </button>
        ))}
        <button style={adding ? on : btn} onClick={() => setAdding((a) => !a)}>{adding ? "Done adding" : "+ Add a piece"}</button>
      </div>

      {piece && (
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", padding: "8px 0", borderTop: "1px solid var(--border)" }}>
          <span style={{ ...mono, fontSize: 10, color: "var(--text)", minWidth: 120 }}>{(piece.label || prettyName(piece.piece)).replace(/^the /, "")}</span>
          <button style={btn} onClick={() => nudge(-0.25, 0)}>←</button>
          <button style={btn} onClick={() => nudge(0.25, 0)}>→</button>
          <button style={btn} onClick={() => nudge(0, -0.25)}>↑</button>
          <button style={btn} onClick={() => nudge(0, 0.25)}>↓</button>
          <button style={btn} onClick={() => onChange(turnPiece(room, piece.id, 90))}>Turn 90°</button>
          <button style={btn} onClick={() => onChange(turnPiece(room, piece.id, 15))}>15°</button>
          <button style={btn} onClick={() => onChange(raisePiece(room, piece.id, 0.25))}>Raise</button>
          <button style={btn} onClick={() => onChange(raisePiece(room, piece.id, -0.25))}>Lower</button>
          <button style={{ ...btn, color: "#C25B5B" }} onClick={() => { onChange(removePiece(room, piece.id)); onSelect(null); }}>Remove</button>
          <span style={{ ...mono, fontSize: 9, color: "var(--muted)" }}>
            {(piece.x ?? 0).toFixed(2)}, {(piece.z ?? 0).toFixed(2)} m · {piece.rot ?? 0}°{piece.y ? ` · ${piece.y}m up` : ""}
          </span>
        </div>
      )}

      {adding && (
        <div style={{ paddingTop: 8, borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
            {groups.map((g) => (
              <button key={g.label} style={group === g.label ? on : btn} onClick={() => setGroup(g.label)}>{g.label}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {(groups.find((g) => g.label === group)?.items ?? []).map((name) => (
              <button key={name} style={btn} onClick={() => {
                const next = addPiece(room, name, { x: 0, z: 0 });
                onChange(next);
                const added = [...(next.props ?? []), ...(next.walls ?? [])].slice(-1)[0];
                onSelect(added?.id ?? null);
              }}>{prettyName(name)}</button>
            ))}
          </div>
          <div style={{ ...mono, fontSize: 10, color: "var(--muted)", marginTop: 8 }}>
            Pieces arrive in the middle of the room. Nudge them into place with the arrows above.
          </div>
        </div>
      )}

      {saved.length > 0 && (
        <div style={{ paddingTop: 10, marginTop: 8, borderTop: "1px solid var(--border)", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ ...mono, fontSize: 10, color: "var(--muted)" }}>My sets</span>
          {saved.map((s) => (
            <span key={s.id} style={{ display: "inline-flex" }}>
              <button style={btn} onClick={() => onLoad(s)}>{s.data?.name || "Untitled set"}</button>
              <button style={{ ...btn, borderLeft: "none", color: "#C25B5B", padding: "5px 7px" }} onClick={() => onDelete(s.id)} title="Delete">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}