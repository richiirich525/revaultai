import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { sanitize, tooBig } from "../src/lib/shareSanitize.js";

/*
  share-rehearsal — RevaultAI

  Makes a share link. The Rehearsal Studio is free and needs no account, and
  handing someone the scene was the one part that did, which made the sign-in
  a toll on the way to the payoff rather than an offer.

  Now:
    no account  -> a link that works at once and expires in 30 days
    signed in   -> a link that is kept, listed and deletable

  So "sign in to keep this" describes what signing in actually buys.

  Why this is a server route rather than a client insert. Anonymous writes have
  to be metered, and only the server can meter them: a policy letting the
  public key insert straight into the table would be an unmetered write to
  rows that run to 400kB. The service role is used here and the table has no
  insert policy for `anon` at all.

  The scene is sanitized AGAIN here. The client already does it before sending,
  but the client is the part an attacker controls, so the whitelist that
  decides what a share may contain has to run somewhere they do not.
*/

const ANON_SHARES_PER_DAY = 3;
const ANON_DAYS = 30;

/*
  A salted hash, never an address, and never returned to anybody. SHARE_IP_SALT
  is the right thing to set; falling back to the service key keeps this working
  without a new environment variable, and the hash is only ever compared with
  other hashes made the same way.
*/
function hashIp(req) {
  const fwd = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const ip = fwd || req.socket?.remoteAddress || "";
  if (!ip) return null;
  const salt = process.env.SHARE_IP_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "revault";
  return crypto.createHmac("sha256", salt).update(ip).digest("hex").slice(0, 32);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    const { rehearsal } = req.body || {};

    const clean = sanitize(rehearsal);
    if (!clean) return res.status(400).json({ error: "There is nothing in this rehearsal to share." });
    if (tooBig(clean)) {
      return res.status(413).json({ error: "This scene is too big to share — try it without a dressed set." });
    }

    // A token is optional. Present and valid means a kept share; absent or
    // invalid means an anonymous one, never an error — a visitor whose session
    // quietly expired should still get their link.
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    let userId = null;
    if (token) {
      const { data: { user } = {} } = await supabase.auth.getUser(token);
      if (user) userId = user.id;
    }

    let expiresAt = null;
    let ipHash = null;

    if (!userId) {
      ipHash = hashIp(req);
      if (!ipHash) return res.status(400).json({ error: "Could not make a link from here. Signing in always works." });

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error: countError } = await supabase
        .from("shared_rehearsals")
        .select("id", { count: "exact", head: true })
        .eq("creator_ip_hash", ipHash)
        .gte("created_at", since);
      if (countError) throw countError;

      if ((count ?? 0) >= ANON_SHARES_PER_DAY) {
        return res.status(429).json({
          error: `That is ${ANON_SHARES_PER_DAY} links from here today, which is the limit without an account. Sign in and there is no limit — and your links stop expiring.`,
          needsAccount: true,
        });
      }
      expiresAt = new Date(Date.now() + ANON_DAYS * 24 * 60 * 60 * 1000).toISOString();
    }

    const { data, error } = await supabase
      .from("shared_rehearsals")
      .insert({
        user_id: userId,
        title: clean.title,
        data: clean,
        creator_ip_hash: ipHash,
        expires_at: expiresAt,
      })
      .select("id")
      .single();
    if (error) throw error;

    return res.status(200).json({
      id: data.id,
      anonymous: !userId,
      expiresAt,
      expiresInDays: userId ? null : ANON_DAYS,
    });
  } catch (err) {
    console.error("share-rehearsal error:", err);
    return res.status(500).json({ error: "Could not make a link just now." });
  }
}
