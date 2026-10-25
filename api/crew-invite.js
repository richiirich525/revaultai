import { createClient } from "@supabase/supabase-js";
import { styleById } from "../src/lib/stylePresets.js";
import { beatById } from "../src/lib/sceneBeats.js";
import { MAX_PACKS_IN_FRAME } from "../src/lib/promptCompiler.js";

/*
  crew-invite — RevaultAI

  A host opens a scene that needs other people in it, and gets a link.

  With no feed, this is how every new person arrives, so the invite is the
  product rather than a share button. Two shapes in one route because they
  are two halves of one object and splitting them would duplicate the whole
  validation: POST with a pack creates an invite, POST with only an id reads
  one for whoever is holding the link.

  The read is deliberately thin. A guest sees who invited them, what the
  scene is, and how many seats are left. Not the host's email, not the other
  guests, not anybody's pack — a link that leaks its participants is a link
  nobody should send.
*/

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    const { inviteId, packId, styleId, beatId, seats } = req.body || {};

    /* ---- reading an invite: no account needed -------------------------- */
    if (typeof inviteId === "string" && inviteId && !packId) {
      const { data, error } = await supabase.rpc("crew_invite_view", { p_invite: inviteId });
      if (error) {
        console.error("crew-invite could not read the invite:", error);
        return res.status(502).json({ error: "Could not read that invite: " + error.message });
      }
      const view = Array.isArray(data) ? data[0] : data;
      if (!view) return res.status(404).json({ error: "That invite does not exist any more." });

      const style = styleById(view.style_id);
      const beat = beatById(view.beat_id);
      return res.status(200).json({
        hostName: view.host_name,
        style: style ? { id: style.id, label: style.label, note: style.note } : null,
        beat: beat ? { id: beat.id, label: beat.label, note: beat.note } : null,
        seats: view.seats,
        taken: view.taken,
        status: view.status,
      });
    }

    /* ---- creating one: the host must own the pack ----------------------- */
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = token ? await supabase.auth.getUser(token) : { data: { user: null } };
    if (!user) return res.status(401).json({ error: "Not signed in" });

    if (typeof packId !== "string" || !packId) {
      return res.status(400).json({ error: "Which of your characters is in this scene?" });
    }
    const style = styleById(styleId);
    if (!style || style.kind !== "genre") {
      return res.status(400).json({ error: "Pick a movie for this scene." });
    }
    if (!beatById(beatId)) return res.status(400).json({ error: "Pick what happens in this scene." });

    /* Two or three, including the host. The compiler refuses four in one
       frame, so an invite must not be able to ask for it — the refusal
       belongs here, before anybody has taken a selfie for a scene that was
       never going to render. */
    const wanted = Number(seats) || 2;
    if (wanted < 2 || wanted > MAX_PACKS_IN_FRAME) {
      return res.status(400).json({ error: `A crew scene holds two or three people, including you.` });
    }

    const { data: pack, error: packError } = await supabase
      .from("vault_entries").select("id")
      .eq("id", packId).eq("user_id", user.id).eq("kind", "character").maybeSingle();
    if (packError) {
      console.error("crew-invite could not read the pack:", packError);
      return res.status(502).json({ error: "Could not read that character: " + packError.message });
    }
    if (!pack) return res.status(404).json({ error: "That character is not in your Vault." });

    const { data: made, error: insertError } = await supabase
      .from("crew_invites")
      .insert({ host_id: user.id, host_pack: packId, style_id: style.id, beat_id: beatId, seats: wanted })
      .select("id, seats")
      .single();
    if (insertError) {
      console.error("crew-invite could not create the invite:", insertError);
      return res.status(502).json({ error: "Could not open that scene: " + insertError.message });
    }

    return res.status(200).json({ inviteId: made.id, seats: made.seats, taken: 1 });
  } catch (error) {
    console.error("crew-invite failed:", error);
    return res.status(500).json({ error: "Something went wrong opening that scene." });
  }
}
