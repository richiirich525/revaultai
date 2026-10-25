import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "../src/lib/admin.js";
import { ANGLES, captureIsUsable, nextAngle } from "../src/lib/captureAngles.js";

/*
  capture-open — RevaultAI

  Opens a capture session and hands back a short code. Whatever device holds
  the camera posts frames into that code; the device that opened it watches
  the angles light up.

  This exists because of a plain physical fact: the camera is never on the
  machine you are working at. On the lot it is a rig with an operator at a
  console, and at home it is the phone in your pocket rather than the laptop
  webcam pointing up your nose. Both are the same handoff, so both are this.

  BOOTH SESSIONS ARE PRIVILEGED. `source` is not decoration: a pack marked
  as booth-captured is the studio's supply advantage, and if any caller could
  claim it the marking would be worth nothing. So a booth session requires a
  signed-in operator, the database refuses one without an operator, and the
  check here is an admin check because studio staff are the only operators
  today. When there are bookable rigs with staff accounts, this is the one
  function that changes.
*/

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/* No O, 0, I, 1 or L. Somebody reads this off a screen and types it on a
   phone, usually in bad light. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function freshCode() {
  let out = "";
  for (let i = 0; i < 6; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return out;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { source, rig, code } = req.body || {};

    /*
      A code in the body means "how far along is this", the same create-or-read
      shape crew-invite.js uses. The read is thin on purpose and goes through
      capture_session_view: a code holder learns which angles are shot and
      nothing else, because the only other thing to learn would be URLs of
      somebody's face. The device that opened the session polls this to light
      up angles as the phone shoots them.
    */
    if (typeof code === "string" && code.trim()) {
      const { data, error } = await supabase
        .rpc("capture_session_view", { p_code: code.trim().toUpperCase() });
      if (error) {
        console.error("capture-open could not read the session:", error);
        return res.status(502).json({ error: "Could not read that capture: " + error.message });
      }
      const view = Array.isArray(data) ? data[0] : data;
      if (!view) return res.status(404).json({ error: "That code does not match a capture." });
      const shot = Array.isArray(view.shot) ? view.shot : [];
      return res.status(200).json({
        source: view.source,
        status: view.expired && view.status === "open" ? "expired" : view.status,
        shot,
        next: nextAngle(shot),
        usable: captureIsUsable(shot),
        packId: view.pack_id ?? null,
        angles: ANGLES,
      });
    }

    const wanted = source === "booth" ? "booth" : "phone-remote";

    const bearer = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = bearer
      ? await supabase.auth.getUser(bearer)
      : { data: { user: null } };

    if (wanted === "booth" && !isAdmin(user)) {
      return res.status(403).json({ error: "A booth capture has to be opened by studio staff." });
    }

    const row = {
      source: wanted,
      owner_id: user?.id ?? null,
      operator_id: wanted === "booth" ? user.id : null,
      rig: wanted === "booth" && typeof rig === "string" ? rig.slice(0, 60) : null,
    };

    /*
      Six characters out of thirty-one is plenty of room, but "plenty of
      room" is not the same as "no collision", and the unique index is the
      thing that actually decides. Retry on the index rather than checking
      first: a check-then-insert has a window between the two.
    */
    let made = null;
    let lastError = null;
    for (let attempt = 0; attempt < 5 && !made; attempt++) {
      const { data, error } = await supabase
        .from("capture_sessions")
        .insert({ ...row, code: freshCode() })
        .select("code, source, expires_at")
        .single();
      if (!error) { made = data; break; }
      lastError = error;
      if (error.code !== "23505") break;
    }

    if (!made) {
      console.error("capture-open could not open a session:", lastError);
      return res.status(502).json({ error: "Could not start a capture: " + (lastError?.message ?? "unknown") });
    }

    return res.status(200).json({
      code: made.code,
      source: made.source,
      expiresAt: made.expires_at,
      angles: ANGLES,
    });
  } catch (error) {
    console.error("capture-open failed:", error);
    return res.status(500).json({ error: "Something went wrong starting that capture." });
  }
}
