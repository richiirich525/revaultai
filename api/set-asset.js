import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { Readable } from "stream";

/*
  set-asset — RevaultAI
  Serves a generated set's files through our own domain, so the browser never
  fetches World Labs directly and no cross-origin rules apply. Links are signed
  and short-lived, and the API key never leaves the server.
*/

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const MARBLE = "https://api.worldlabs.ai/marble/v1";
const SECRET = () => process.env.SET_ASSET_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const KINDS = {
  full: { pick: (a) => a?.splats?.spz_urls?.full_res, type: "application/octet-stream" },
  "500k": { pick: (a) => a?.splats?.spz_urls?.["500k"], type: "application/octet-stream" },
  "100k": { pick: (a) => a?.splats?.spz_urls?.["100k"], type: "application/octet-stream" },
  collider: { pick: (a) => a?.mesh?.collider_mesh_url, type: "model/gltf-binary" },
  pano: { pick: (a) => a?.imagery?.pano_url, type: "image/png" },
  thumb: { pick: (a) => a?.thumbnail_url, type: "image/jpeg" },
};

export function signAsset(setId, kind, minutes = 180) {
  const exp = Date.now() + minutes * 60_000;
  const sig = crypto.createHmac("sha256", SECRET()).update(`${setId}.${kind}.${exp}`).digest("hex").slice(0, 32);
  return `/api/set-asset?id=${encodeURIComponent(setId)}&k=${kind}&exp=${exp}&sig=${sig}`;
}

export default async function handler(req, res) {
  try {
    const { id, k, exp, sig } = req.query || {};
    const kind = KINDS[k];
    if (!id || !kind || !exp || !sig) return res.status(400).send("Bad request");
    if (Number(exp) < Date.now()) return res.status(410).send("That link has expired — reopen the set.");

    const expected = crypto.createHmac("sha256", SECRET()).update(`${id}.${k}.${exp}`).digest("hex").slice(0, 32);
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(sig)))) {
      return res.status(403).send("Bad signature");
    }

    const { data: row } = await supabase.from("sets").select("world_id, status").eq("id", id).maybeSingle();
    if (!row?.world_id || row.status !== "ready") return res.status(404).send("Set not ready");

    const w = await fetch(`${MARBLE}/worlds/${row.world_id}`, {
      headers: { "WLT-Api-Key": process.env.WORLDLABS_API_KEY },
    });
    const world = await w.json().catch(() => ({}));
    const url = kind.pick((world?.world ?? world)?.assets);
    if (!url) return res.status(404).send("That file isn't available");

    const file = await fetch(url);
    if (!file.ok || !file.body) return res.status(502).send("Couldn't fetch that file");

    res.setHeader("Content-Type", file.headers.get("content-type") || kind.type);
    const len = file.headers.get("content-length");
    if (len) res.setHeader("Content-Length", len);
    res.setHeader("Cache-Control", "private, max-age=3600");
    Readable.fromWeb(file.body).pipe(res);
  } catch (err) {
    console.error("set-asset failed:", err);
    if (!res.headersSent) res.status(500).send("Something went wrong fetching that file");
  }
}