import { createClient } from "@supabase/supabase-js";
import { spineFrom, spineGaps, spineIsUsable, MIN_SHOTS } from "../src/lib/sequenceSpine.js";

/*
  spine-gate — RevaultAI

  Runs the sequence spine across projects that already exist and reports how
  many of them carry enough structure for a continuity check to have anything
  to say. Writes nothing.

  This is the same instrument as world-gate.js, pointed at a different
  assumption, for the same reason: the decision to build drift detection and
  selective regeneration rests on a claim that can be measured instead of
  argued about — that a Shot Spec already holds what a sequence is made of,
  without asking the creator for anything new. Story Worlds made that bet
  against finished takes and lost it 71 times. An evening spent asking the
  question is the cheapest part of either answer.

  It names WHY each project falls short, counted across the whole set, so the
  fix is aimed. "Four of nine, and five of them have no fact appearing twice"
  is a different instruction from "four of nine".

  ONE NUMBER HERE IS NOT ABOUT CONTENT AT ALL. A shot reaches its spec only
  through the take chosen for it: `shots` has no spec column, and the link
  runs shot -> selected_generation -> film_spec. So a project can be fully
  planned and still read as unplanned here, because the specs exist and
  nothing points at them. `unattachedSpecs` counts exactly that, and if it is
  large the fix is a column rather than more authoring. Worth knowing before
  concluding anything about how people plan.

  Read-only, admin-only, capped, and batched — four queries rather than four
  per project, because an N+1 over a hundred shots would time out and report
  a worse number than the truth.
*/

const MAX_SHOTS = 500;
const ADMIN_EMAILS = ["richardgarland999@gmail.com"];

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const { data: { user } } = token ? await supabase.auth.getUser(token) : { data: { user: null } };
    if (!user) return res.status(401).json({ error: "Sign in first." });
    if (!ADMIN_EMAILS.includes((user.email || "").toLowerCase())) {
      return res.status(403).json({ error: "Not yours to run." });
    }

    const body = req.body || {};
    const limit = Math.min(Number(body.limit) || MAX_SHOTS, MAX_SHOTS);
    /*
      Admin-only, and lifted across every read or none. world-gate learned
      this the hard way: half-lifting the owner filter reported other
      people's work as empty, because the shots were theirs and the specs
      were not found under this account.
    */
    const everyone = body.scope === "all";
    const mine = (q) => (everyone ? q : q.eq("user_id", user.id));

    const { data: shots, error: shotError } = await mine(
      supabase.from("shots").select("id, user_id, project_id, name, selected_generation_id"),
    ).limit(limit);
    if (shotError) {
      console.error("spine-gate could not read shots:", shotError);
      return res.status(502).json({ error: "Could not read shots: " + shotError.message });
    }
    if (!shots?.length) {
      return res.status(200).json({
        scope: everyone ? "all" : "mine",
        shots: 0, projects: 0, usable: 0, percent: 0,
        reasons: [], note: "No shots to measure yet.",
      });
    }

    /*
      Where the chain breaks matters more than that it broke. shot ->
      selected_generation -> film_spec has two joints, and they call for
      different fixes: shots with no chosen take mean the planning never
      reached a render, while chosen takes carrying no spec mean the render
      forgot which plan it came from. Counting only the end of the chain
      cannot tell those apart, and the first run of this gate could not.
    */
    const withTake = shots.filter((s) => s.selected_generation_id).length;
    const genIds = [...new Set(shots.map((s) => s.selected_generation_id).filter(Boolean))];
    const { data: gens, error: genError } = genIds.length
      ? await supabase.from("generations")
          .select("id, film_spec_id, film_spec_version").in("id", genIds)
      : { data: [], error: null };
    if (genError) {
      console.error("spine-gate could not read generations:", genError);
      return res.status(502).json({ error: "Could not read takes: " + genError.message });
    }

    const genById = new Map((gens ?? []).map((g) => [g.id, g]));
    const specIds = [...new Set((gens ?? []).map((g) => g.film_spec_id).filter(Boolean))];

    const { data: specs, error: specError } = specIds.length
      ? await supabase.from("film_specs").select("id, spec").in("id", specIds)
      : { data: [], error: null };
    if (specError) {
      console.error("spine-gate could not read specs:", specError);
      return res.status(502).json({ error: "Could not read specs: " + specError.message });
    }
    const specById = new Map((specs ?? []).map((s) => [s.id, s.spec]));

    /* Every spec in these projects, attached or not. The difference between
       this and specIds is the measurement that is about plumbing rather than
       about how anybody works. */
    const projectIds = [...new Set(shots.map((s) => s.project_id).filter(Boolean))];
    const { data: allSpecs, error: allSpecError } = projectIds.length
      ? await mine(supabase.from("film_specs").select("id, project_id")).in("project_id", projectIds)
      : { data: [], error: null };
    if (allSpecError) {
      console.error("spine-gate could not count specs:", allSpecError);
      return res.status(502).json({ error: "Could not count specs: " + allSpecError.message });
    }

    /* ---- group into sequences and build a spine for each ---------------- */
    const byProject = new Map();
    for (const shot of shots) {
      const pid = shot.project_id || "loose:" + shot.user_id;
      if (!byProject.has(pid)) byProject.set(pid, []);
      const gen = shot.selected_generation_id ? genById.get(shot.selected_generation_id) : null;
      byProject.get(pid).push({
        id: shot.id,
        name: shot.name,
        generationId: shot.selected_generation_id ?? null,
        specId: gen?.film_spec_id ?? null,
        specVersion: gen?.film_spec_version ?? null,
        spec: gen?.film_spec_id ? specById.get(gen.film_spec_id) ?? null : null,
      });
    }

    const reasons = new Map();
    const examples = [];
    let usable = 0;

    for (const [pid, list] of byProject) {
      const spine = spineFrom({ title: pid, shots: list });
      const gaps = spineGaps(spine);
      const ok = spineIsUsable(spine);
      if (ok) usable++;
      for (const g of gaps) reasons.set(g.id, { id: g.id, why: g.why, count: (reasons.get(g.id)?.count ?? 0) + 1 });
      if (examples.length < 8) {
        examples.push({
          project: pid.startsWith("loose:") ? "(shots with no project)" : pid,
          shots: spine.counts.shots,
          withSpec: spine.counts.withSpec,
          rendered: spine.counts.rendered,
          carriers: spine.counts.carriers,
          usable: ok,
          /* The most-repeated facts, which is the fastest read on whether a
             spine would be checking anything worth checking. */
          topCarriers: spine.carries.slice(0, 4).map((c) => `${c.dimension}: ${c.value} (${c.beats.length} shots)`),
          gaps: gaps.map((g) => g.id),
        });
      }
    }

    const projects = byProject.size;
    const attached = specIds.length;
    const total = (allSpecs ?? []).length;

    return res.status(200).json({
      scope: everyone ? "all" : "mine",
      shots: shots.length,
      projects,
      usable,
      percent: projects ? Math.round((usable / projects) * 100) : 0,
      minShots: MIN_SHOTS,
      chain: {
        shots: shots.length,
        withAChosenTake: withTake,
        /* Of the chosen takes, how many recorded the spec they came from. */
        takesCarryingASpec: (gens ?? []).filter((g) => g.film_spec_id).length,
      },
      specs: {
        reachableFromAShot: attached,
        inThoseProjects: total,
        /* If this is high, the planning exists and the link does not. */
        unattached: Math.max(0, total - attached),
      },
      reasons: [...reasons.values()].sort((a, b) => b.count - a.count),
      examples,
    });
  } catch (error) {
    console.error("spine-gate failed:", error);
    return res.status(500).json({ error: "The measurement could not run." });
  }
}
