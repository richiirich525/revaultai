import { createClient } from "@supabase/supabase-js";

/*
  casting-call — RevaultAI

  A role, and a link anybody can audition for.

  The sibling of crew-invite and shaped like it: two shapes in one route,
  because they are two halves of one object and splitting them would
  duplicate the whole validation. POST with role text creates a call; POST
  with only an id reads one for whoever is holding the link.

  The read is thin on purpose, and thinner than it looks. Anyone gets the
  role, who is casting it and how many have auditioned. The OWNER of the
  call gets the auditions as well, in the same response — not through a
  policy, which would mean the table was readable at all, but because this
  route checked their ownership first. casting_auditions has no policies
  whatsoever for the same reason crew_members has none: a client that could
  list it could see which strangers auditioned for what.

  WHO MAY POST A CALL. Owner only, for now. A casting call is a public link
  with a person's name on it that strangers upload their faces to, and
  there is no text moderation in this codebase yet — role_name and
  role_brief go straight onto a page a stranger reads. Opening this to every
  creator is one line below, and should not be flipped until that
  moderation exists.
*/

const OWNERS_ONLY = true;
const ADMIN_EMAILS = ["richardgarland999@gmail.com"];

const MAX_ROLE_NAME = 60;
const MAX_ROLE_BRIEF = 600;
const DEFAULT_CAP = 50;
const MAX_CAP = 500;

/*
  No control characters and no runaway whitespace on a page a stranger reads.
  Done by code point rather than by a regex over the control range, which
  eslint's no-control-regex rightly objects to. Each one becomes a space
  rather than vanishing, so a line break between two words does not weld
  them together before the whitespace collapse runs.
*/
const clean = (v, max) =>
  [...String(v ?? "")]
    .map((ch) => { const c = ch.codePointAt(0); return c < 32 || c === 127 ? " " : ch; })
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    const { callId, roleName, roleBrief, filmSpecId, maxAuditions } = req.body || {};

    const authToken = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = authToken
      ? await supabase.auth.getUser(authToken)
      : { data: { user: null } };

    /* ---- reading a call: no account needed ----------------------------- */
    if (typeof callId === "string" && callId && !roleName) {
      const { data, error } = await supabase.rpc("casting_call_view", { p_call: callId });
      if (error) {
        console.error("casting-call could not read the call:", error);
        return res.status(502).json({ error: "Could not read that call: " + error.message });
      }
      const view = Array.isArray(data) ? data[0] : data;
      if (!view) return res.status(404).json({ error: "That casting call does not exist any more." });

      const body = {
        roleName: view.role_name,
        roleBrief: view.role_brief,
        casterName: view.caster_name,
        submissions: view.submissions,
        maxAuditions: view.max_auditions,
        status: view.status,
      };

      /* The owner, and only the owner, also gets the auditions. Checked here
         rather than granted in a policy, so the table stays unreadable. */
      if (user) {
        const { data: own } = await supabase
          .from("casting_calls").select("id").eq("id", callId).eq("owner_id", user.id).maybeSingle();
        if (own) {
          const { data: auditions } = await supabase
            .from("casting_auditions")
            .select("id, display_name, status, created_at, pack_id, pending_token")
            .eq("call_id", callId)
            .order("created_at", { ascending: true });
          body.isOwner = true;
          body.auditions = (auditions ?? []).map((a) => ({
            id: a.id,
            name: a.display_name,
            status: a.status,
            at: a.created_at,
            anonymous: !a.pack_id,
          }));
        }
      }
      return res.status(200).json(body);
    }

    /* ---- creating one -------------------------------------------------- */
    if (!user) return res.status(401).json({ error: "Not signed in" });
    if (OWNERS_ONLY && !ADMIN_EMAILS.includes((user.email ?? "").toLowerCase())) {
      return res.status(403).json({ error: "Casting calls are not open yet." });
    }

    const name = clean(roleName, MAX_ROLE_NAME);
    const brief = clean(roleBrief, MAX_ROLE_BRIEF);
    if (!name) return res.status(400).json({ error: "Give the role a name." });
    if (brief.length < 20) {
      return res.status(400).json({ error: "Say a little more about who this person is — twenty characters at least." });
    }

    const cap = Math.min(Math.max(Number(maxAuditions) || DEFAULT_CAP, 1), MAX_CAP);

    /* A spec is optional, and must be the caller's own if given. */
    let specId = null;
    if (typeof filmSpecId === "string" && filmSpecId) {
      const { data: spec } = await supabase
        .from("film_specs").select("id").eq("id", filmSpecId).eq("user_id", user.id).maybeSingle();
      if (!spec) return res.status(404).json({ error: "That shot is not one of yours." });
      specId = spec.id;
    }

    const { data: made, error: insertError } = await supabase
      .from("casting_calls")
      .insert({ owner_id: user.id, role_name: name, role_brief: brief, film_spec_id: specId, max_auditions: cap })
      .select("id, max_auditions")
      .single();
    if (insertError) {
      console.error("casting-call could not create the call:", insertError);
      return res.status(502).json({ error: "Could not open that call: " + insertError.message });
    }

    return res.status(200).json({ callId: made.id, maxAuditions: made.max_auditions });
  } catch (error) {
    console.error("casting-call failed:", error);
    return res.status(500).json({ error: "Something went wrong with that casting call." });
  }
}
