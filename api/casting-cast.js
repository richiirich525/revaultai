import { createClient } from "@supabase/supabase-js";
import { styleById } from "../src/lib/stylePresets.js";
import { beatById } from "../src/lib/sceneBeats.js";

/*
  casting-cast — RevaultAI

  The owner picks somebody, and the picking does not shoot anything.

  This is the hinge the whole feature turns on. Casting creates an ORDINARY
  crew invite addressed to the chosen pack, and the existing mechanic takes
  it from there: the invite carries the style and the beat, the person sees
  the actual scene before accepting, and the host presses shoot and pays.
  Nothing here generates, nothing here charges, and the owner never gains
  the power to put a face in a film the face's owner has not seen.

  Auditioning said "consider me". The crew invite says "this scene, this
  night, is that still a yes". Only the second one puts anybody on screen.

  Everyone not chosen is marked passed in the same transaction-shaped pass.
  They keep the pack they built, which is the thing they actually came away
  with, and for an anonymous auditioner it is still sitting in pending_packs
  waiting to be claimed on sign-up.
*/

const ADMIN_EMAILS = ["richardgarland999@gmail.com"];
const OWNERS_ONLY = true;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = token ? await supabase.auth.getUser(token) : { data: { user: null } };
    if (!user) return res.status(401).json({ error: "Not signed in" });
    if (OWNERS_ONLY && !ADMIN_EMAILS.includes((user.email ?? "").toLowerCase())) {
      return res.status(403).json({ error: "Casting calls are not open yet." });
    }

    const { callId, auditionId, styleId, beatId, hostPackId } = req.body || {};
    if (typeof callId !== "string" || !callId) return res.status(400).json({ error: "Which casting call?" });
    if (!auditionId) return res.status(400).json({ error: "Which audition are you casting?" });

    /* The scene is chosen now, not when the call was posted, because this is
       what the person being cast is about to be shown and asked to agree to. */
    const style = styleById(styleId);
    if (!style || style.kind !== "genre") return res.status(400).json({ error: "Pick a movie for this scene." });
    if (!beatById(beatId)) return res.status(400).json({ error: "Pick what happens in this scene." });

    const { data: call } = await supabase
      .from("casting_calls").select("id, owner_id, status")
      .eq("id", callId).eq("owner_id", user.id).maybeSingle();
    if (!call) return res.status(404).json({ error: "That casting call is not yours." });
    if (call.status !== "open") return res.status(409).json({ error: "That call has already been settled." });

    const { data: pick } = await supabase
      .from("casting_auditions").select("id, pack_id, pending_token, display_name")
      .eq("id", auditionId).eq("call_id", callId).maybeSingle();
    if (!pick) return res.status(404).json({ error: "That audition is not in this call." });

    /* The host is in the scene too, with a pack of their own — crew_invites
       requires one, and a crew of guests with no host is not a scene. */
    const { data: hostPack } = await supabase
      .from("vault_entries").select("id")
      .eq("id", hostPackId).eq("user_id", user.id).eq("kind", "character").maybeSingle();
    if (!hostPack) return res.status(404).json({ error: "Which of your characters is in this scene?" });

    const { data: invite, error: inviteError } = await supabase
      .from("crew_invites")
      .insert({ host_id: user.id, host_pack: hostPack.id, style_id: style.id, beat_id: beatId, seats: 2 })
      .select("id")
      .single();
    if (inviteError) {
      console.error("casting-cast could not open the scene:", inviteError);
      return res.status(502).json({ error: "Could not open that scene: " + inviteError.message });
    }

    /* Order matters. The chosen row first, so the unique index on
       (call_id) where status = 'cast' refuses a second cast before anything
       else has moved. */
    const { error: castError } = await supabase
      .from("casting_auditions").update({ status: "cast" }).eq("id", pick.id).eq("status", "submitted");
    if (castError) {
      console.error("casting-cast could not mark the audition:", castError);
      return res.status(409).json({ error: "Somebody has already been cast in this role." });
    }

    await supabase
      .from("casting_auditions").update({ status: "passed" })
      .eq("call_id", callId).neq("id", pick.id).eq("status", "submitted");

    const { error: closeError } = await supabase
      .from("casting_calls").update({ status: "cast", crew_invite_id: invite.id }).eq("id", callId);
    if (closeError) console.error("casting-cast could not close the call:", closeError.message);

    /* The invite id is the whole result: the owner sends that link to the
       person they cast, and nothing has happened to anybody until it is
       opened and accepted. */
    return res.status(200).json({ inviteId: invite.id, castName: pick.display_name });
  } catch (error) {
    console.error("casting-cast failed:", error);
    return res.status(500).json({ error: "Something went wrong casting that role." });
  }
}
