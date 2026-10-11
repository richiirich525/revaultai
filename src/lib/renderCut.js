/*
  renderCut — RevaultAI (Finish)

  Stitches an assembled cut into one playable MP4, entirely in the browser,
  using ffmpeg compiled to WebAssembly. Nothing is uploaded and nothing is
  generated: the clips the viewer already has are trimmed to the cut's in and
  out points and joined.

  Two passes, deliberately. The clips come from different models at different
  frame rates and resolutions, so a stream-copy concatenation of them would
  produce a broken file. Pass one re-encodes every piece to one shared format
  — same size, rate, pixel format, sample rate and channel count, with silent
  clips given a silent track so the audio stream never drops out mid-cut.
  Pass two then joins those uniform pieces by copying, which is fast.

  This module pulls in a ~32 MB WebAssembly build, so import it dynamically,
  at the moment someone asks for a render.
*/

import { FFmpeg } from "@ffmpeg/ffmpeg";
// These must be the specifiers the packages actually export. Both ship strict
// exports maps with no wildcards, so a deep path into dist/ resolves in dev,
// where Vite resolves lazily, and then fails the production build outright.
import coreURL from "@ffmpeg/core?url";
import wasmURL from "@ffmpeg/core/wasm?url";
import classWorkerURL from "@ffmpeg/ffmpeg/worker?url";

const r3 = (n) => Math.round(n * 1000) / 1000;

function normalizeArgs({ input, start, duration, width, height, fps, hasAudio, out }) {
  const vf = [
    `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`,
    `fps=${fps}`,
    "setsar=1",
  ].join(",");

  // -ss before -i seeks the input; -t after it bounds the output. Together
  // they are unambiguous, where -to would be read against the output clock.
  const args = ["-ss", String(start), "-t", String(duration), "-i", input];

  // A piece with no sound still needs an audio stream, or the join produces a
  // file whose audio stops partway through.
  if (!hasAudio) {
    args.push("-f", "lavfi", "-t", String(duration), "-i", "anullsrc=channel_layout=stereo:sample_rate=48000");
    args.push("-map", "0:v:0", "-map", "1:a:0");
  }

  args.push(
    "-vf", vf,
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2",
    "-video_track_timescale", String(fps * 1000),
    "-y", out,
  );
  return args;
}

/**
 * @param shots    ordered [{ generationId, from, to }]
 * @param byId     { [generationId]: { data: Uint8Array, info } }
 * @param format   { width, height, fps }
 * @param onStatus (message, fraction) — fraction is 0..1, or null while loading
 * @param signal   AbortSignal to cancel
 * @returns { data: Uint8Array, seconds, pieces }
 */
export async function renderCut({ shots, byId, format, onStatus, signal }) {
  const usable = shots.filter((s) => byId[s.generationId]);
  if (usable.length === 0) throw new Error("None of this cut's clips could be fetched.");

  const { width, height, fps } = format;
  const ffmpeg = new FFmpeg();

  try {
    onStatus?.("Loading the video engine…", null);
    await ffmpeg.load({ coreURL, wasmURL, classWorkerURL });
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    // Each distinct source goes in once, however many pieces use it.
    const srcName = {};
    let i = 0;
    for (const id of Object.keys(byId)) {
      srcName[id] = `src_${i++}.mp4`;
      await ffmpeg.writeFile(srcName[id], byId[id].data, { signal });
    }

    const parts = [];
    let seconds = 0;
    for (let n = 0; n < usable.length; n++) {
      const s = usable[n];
      const src = byId[s.generationId];
      const duration = r3(s.to - s.from);
      const out = `part_${String(n).padStart(2, "0")}.mp4`;

      onStatus?.(`Trimming piece ${n + 1} of ${usable.length}…`, n / (usable.length + 1));
      const code = await ffmpeg.exec(
        normalizeArgs({
          input: srcName[s.generationId],
          start: r3(s.from),
          duration,
          width, height, fps,
          hasAudio: !!src.info?.hasAudio,
          out,
        }),
        -1,
        { signal },
      );
      if (code !== 0) throw new Error(`Piece ${n + 1} failed to render.`);
      parts.push(out);
      seconds += duration;
    }

    // Free the sources before the join so peak memory is pieces-only.
    for (const name of Object.values(srcName)) {
      try { await ffmpeg.deleteFile(name); } catch { /* already gone */ }
    }

    onStatus?.("Joining the pieces…", usable.length / (usable.length + 1));
    const list = parts.map((p) => `file '${p}'`).join("\n") + "\n";
    await ffmpeg.writeFile("list.txt", new TextEncoder().encode(list), { signal });

    const joinCode = await ffmpeg.exec(
      ["-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", "-movflags", "+faststart", "-y", "cut.mp4"],
      -1,
      { signal },
    );
    if (joinCode !== 0) throw new Error("The pieces rendered, but joining them failed.");

    const data = await ffmpeg.readFile("cut.mp4", undefined, { signal });
    onStatus?.("Done.", 1);
    return { data: data instanceof Uint8Array ? data : new Uint8Array(data), seconds: r3(seconds), pieces: usable.length };
  } finally {
    // Terminating drops the whole virtual filesystem with it, so there is no
    // per-file cleanup to do here and nothing is left behind on a failure.
    try { ffmpeg.terminate(); } catch { /* never worth surfacing */ }
  }
}
