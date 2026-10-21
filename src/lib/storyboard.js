/*
  storyboard — RevaultAI

  Turns the frames captured from each camera into one sheet you can print,
  email or drop into a deck. One file rather than a folder of numbered JPEGs,
  because a storyboard is a thing you read in order, and because a browser
  download of several files at once is a permission prompt nobody enjoys.

  The arithmetic here is separate from the drawing so it can be checked
  without a canvas: layout() decides the grid and the pixel box of every
  cell, and draw() just paints into it.
*/

export const SHEET = {
  pad: 28,          // outside margin
  gap: 20,          // between cells
  cell: 560,        // target cell width before fitting
  caption: 58,      // caption strip under each frame
  header: 92,       // title block
  footer: 34,
};

// Which grid, and where every cell lands. Pure arithmetic, no canvas.
export function layout(count, { aspect = 16 / 9, ...o } = {}) {
  const s = { ...SHEET, ...o };
  if (count <= 0) return null;
  const cols = count === 1 ? 1 : 2;
  const rows = Math.ceil(count / cols);
  const cw = s.cell;
  const ch = Math.round(cw / aspect);
  const cells = [];
  for (let i = 0; i < count; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    cells.push({
      x: s.pad + c * (cw + s.gap),
      y: s.header + r * (ch + s.caption + s.gap),
      w: cw,
      h: ch,
      capY: s.header + r * (ch + s.caption + s.gap) + ch,
      capH: s.caption,
    });
  }
  return {
    cols,
    rows,
    cellW: cw,
    cellH: ch,
    width: s.pad * 2 + cols * cw + (cols - 1) * s.gap,
    height: s.header + rows * (ch + s.caption) + (rows - 1) * s.gap + s.footer + s.pad,
    cells,
    style: s,
  };
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("a frame would not load"));
    img.src = url;
  });
}

/*
  frames: [{ url, name, caption }]
  Returns a Blob, not a data URL — a sheet of four frames is comfortably
  past the data-URL length some browsers will follow in an <a download>.
*/
export async function buildSheet({ frames, title, note }) {
  if (!frames?.length) throw new Error("nothing to draw");
  const imgs = await Promise.all(frames.map((f) => loadImage(f.url)));
  const first = imgs[0];
  const aspect = first.naturalWidth && first.naturalHeight
    ? first.naturalWidth / first.naturalHeight
    : 16 / 9;

  const L = layout(frames.length, { aspect });
  const canvas = document.createElement("canvas");
  canvas.width = L.width;
  canvas.height = L.height;
  const g = canvas.getContext("2d");

  g.fillStyle = "#0E0F14";
  g.fillRect(0, 0, L.width, L.height);

  g.fillStyle = "#E8E6F0";
  g.font = "600 30px Helvetica, Arial, sans-serif";
  g.textBaseline = "alphabetic";
  g.fillText(title || "Rehearsal", L.style.pad, 46);
  if (note) {
    g.fillStyle = "#8C889B";
    g.font = "15px Helvetica, Arial, sans-serif";
    g.fillText(note, L.style.pad, 70);
  }

  imgs.forEach((img, i) => {
    const c = L.cells[i];
    g.fillStyle = "#000";
    g.fillRect(c.x, c.y, c.w, c.h);
    g.drawImage(img, c.x, c.y, c.w, c.h);
    g.strokeStyle = "rgba(255,255,255,0.14)";
    g.lineWidth = 1;
    g.strokeRect(c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1);

    g.fillStyle = "#14151C";
    g.fillRect(c.x, c.capY, c.w, c.capH);
    g.fillStyle = "#E8E6F0";
    g.font = "600 17px Helvetica, Arial, sans-serif";
    g.fillText(frames[i].name ?? `Camera ${i + 1}`, c.x + 12, c.capY + 24);
    g.fillStyle = "#9B98A8";
    g.font = "14px Helvetica, Arial, sans-serif";
    g.fillText(frames[i].caption ?? "", c.x + 12, c.capY + 45);
  });

  g.fillStyle = "#6B6878";
  g.font = "13px Helvetica, Arial, sans-serif";
  g.fillText("Blocked in the RevaultAI Rehearsal Studio", L.style.pad, L.height - L.style.pad);

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("the sheet would not encode"))), "image/jpeg", 0.94);
  });
}

// Hand a blob to the browser as a download, and let go of the URL after.
export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// "Dinner argument" -> "dinner-argument-storyboard.jpg"
export function assetName(title, suffix, ext) {
  const stem = String(title || "rehearsal")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "rehearsal";
  const tail = suffix ? "-" + String(suffix).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : "";
  return `${stem}${tail}.${ext}`;
}

export const sheetName = (title) => assetName(title, "storyboard", "jpg");
