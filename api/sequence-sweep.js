import { createClient } from "@supabase/supabase-js";
import { spineFrom, sweepFrom } from "../src/lib/sequenceSpine.js";

/*
  sequence-sweep — RevaultAI

  A whole project's continuity in one read: which plans have been filmed,
  which of those have been compared against the plan, and which commitments
  look broken.

  WHY IT IS A READ AND NOT A RUN. Frames come off a <video> element in the
  browser; nothing on a server here can look at footage. So this reports the
  observations that exist and names the beats that have none, rather than
  pretending to have checked them. The checking stays where it already works,
  one take at a time, in StateReview.

  That is also the honest division of cost. A sweep that silently ran twenty
  vision passes because somebody opened a page would be a bill nobody agreed
  to.

  The sequence is the project's film_specs in the order they were written.
  Not its shots: a shot is a record of a generation, created when a take is
  made, and measuring through them found two of thirty-five.
*/

const MAX_SPECS = 200;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = token ? await supabase.auth.getUser(token) : { data: { user: null } };
    if (!user) return res.status(401).json({ error: "Sign in first." });

    const { projectId } = req.body || {};
    if (typeof projectId !== "string" || !projectId) {
      return res.status(400).json({ error: "Which project?" });
    }

    const { data: specs, error: specError } = await supabase
      .from("film_specs")
      .select("id, title, version, spec, created_at")
      .eq("project_id", projectId).eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(MAX_SPECS);
    if (specError) {
      console.error("sequence-sweep could not read specs:", specError);
      return res.status(502).json({ error: "Could not read that project's plans: " + specError.message });
    }
    if (!specs?.length) {
      return res.status(200).json({
        sweep: { beats: [], commitments: [], counts: { beats: 0 }, next: [{ id: "empty", why: "nothing planned in this project yet" }] },
      });
    }

    const specIds = specs.map((s) => s.id);
    const { data: gens, error: genError } = await supabase
      .from("generations")
      .select("id, film_spec_id, status, created_at")
      .eq("user_id", user.id).in("film_spec_id", specIds);
    if (genError) {
      console.error("sequence-sweep could not read takes:", genError);
      return res.status(502).json({ error: "Could not read that project's takes: " + genError.message });
    }

    /* One take per plan: a finished one beats an unfinished one, and the
       most recent finished one beats an earlier finished one, because that
       is the version somebody is looking at. */
    const filmed = new Map();
    for (const g of gens ?? []) {
      if (!g.film_spec_id) continue;
      const have = filmed.get(g.film_spec_id);
      if (!have) { filmed.set(g.film_spec_id, g); continue; }
      const better = have.status !== "complete" && g.status === "complete";
      const newer = have.status === g.status && (g.created_at ?? "") > (have.created_at ?? "");
      if (better || newer) filmed.set(g.film_spec_id, g);
    }

    const genIds = [...filmed.values()].map((g) => g.id);
    const { data: observations, error: obsError } = genIds.length
      ? await supabase.from("observed_states")
          .select("generation_id, differences, resolution")
          .eq("user_id", user.id).in("generation_id", genIds)
      : { data: [], error: null };
    if (obsError) {
      console.error("sequence-sweep could not read observations:", obsError);
      return res.status(502).json({ error: "Could not read what was observed: " + obsError.message });
    }

    const spine = spineFrom({
      shots: specs.map((row) => ({
        id: row.id,
        name: row.title || "Untitled shot",
        generationId: filmed.get(row.id)?.id ?? null,
        specId: row.id,
        specVersion: row.version ?? null,
        spec: row.spec ?? null,
      })),
    });

    const sweep = sweepFrom({ spine, observations: observations ?? [] });

    /* The generation behind each beat rides along so the interface can send
       somebody straight to the take that needs checking. */
    const beats = sweep.beats.map((b) => ({
      ...b,
      specId: spine.beats[b.index]?.specId ?? null,
      generationId: spine.beats[b.index]?.generationId ?? null,
    }));

    return res.status(200).json({ sweep: { ...sweep, beats }, carriers: spine.counts.carriers });
  } catch (error) {
    console.error("sequence-sweep failed:", error);
    return res.status(500).json({ error: "Something went wrong reading that sequence." });
  }
}
