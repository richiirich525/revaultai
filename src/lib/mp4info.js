/*
  mp4info — RevaultAI (Finish, pass 4)
  Reads a video file's own header for its frame rate, length and whether it
  has sound. Exact, no playback, no dependencies.
*/

const CONTAINERS = new Set(["moov", "trak", "mdia", "minf", "stbl"]);

function boxes(view, start, end, out = []) {
  let p = start;
  while (p + 8 <= end) {
    let size = view.getUint32(p);
    const type = String.fromCharCode(view.getUint8(p + 4), view.getUint8(p + 5), view.getUint8(p + 6), view.getUint8(p + 7));
    let header = 8;
    if (size === 1) { size = Number(view.getBigUint64(p + 8)); header = 16; }
    else if (size === 0) size = end - p;
    if (size < header || p + size > end) break;
    out.push({ type, start: p + header, end: p + size });
    p += size;
  }
  return out;
}

function child(view, box, type) {
  return boxes(view, box.start, box.end).find((b) => b.type === type) ?? null;
}

export function readMp4Info(buffer) {
  const view = new DataView(buffer instanceof ArrayBuffer ? buffer : buffer.buffer);
  const moov = boxes(view, 0, view.byteLength).find((b) => b.type === "moov");
  if (!moov) return null;

  let video = null;
  let hasAudio = false;
  for (const trak of boxes(view, moov.start, moov.end).filter((b) => b.type === "trak")) {
    const mdia = child(view, trak, "mdia");
    if (!mdia) continue;
    const hdlr = child(view, mdia, "hdlr");
    const handler = hdlr ? String.fromCharCode(...[8, 9, 10, 11].map((i) => view.getUint8(hdlr.start + i))) : "";
    if (handler === "soun") { hasAudio = true; continue; }
    if (handler !== "vide" || video) continue;

    const mdhd = child(view, mdia, "mdhd");
    if (!mdhd) continue;
    const v1 = view.getUint8(mdhd.start) === 1;
    const timescale = view.getUint32(mdhd.start + (v1 ? 20 : 12));
    const duration = v1 ? Number(view.getBigUint64(mdhd.start + 24)) : view.getUint32(mdhd.start + 16);

    // The most common gap between frames sets the rate.
    let frames = 0, delta = 0;
    const stbl = child(view, child(view, mdia, "minf") ?? mdia, "stbl");
    const stts = stbl ? child(view, stbl, "stts") : null;
    if (stts) {
      const n = view.getUint32(stts.start + 4);
      let best = 0;
      for (let i = 0; i < n; i++) {
        const count = view.getUint32(stts.start + 8 + i * 8);
        const d = view.getUint32(stts.start + 12 + i * 8);
        frames += count;
        if (count > best) { best = count; delta = d; }
      }
    }
    const fps = delta && timescale ? timescale / delta : frames && duration ? (frames * timescale) / duration : 0;
    video = { fps, timescale, seconds: timescale ? duration / timescale : 0, frames };
  }
  if (!video || !video.fps) return null;

  const fps = Math.round(video.fps * 1000) / 1000;
  return { fps, nominal: Math.round(fps), seconds: Math.round(video.seconds * 1000) / 1000, frames: video.frames, hasAudio };
}