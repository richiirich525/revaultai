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

  THE SEQUENCE IS THE SPECS, NOT THE SHOTS. The first version of this joined
  from `shots` and read zero, which was true and useless. Shots are records of
  generation activity — generate-video creates one when a take is made — while
  a Shot Spec is a plan, written in the Rehearsal Studio or on /specs against a
  project and referencing no shot at all. The two have never been related, and
  a join between them was inventing a link nobody built. Measured against 35
  shots it reported 0 of 4 projects while 8 specs sat in those same projects,
  which is an instrument fault rather than a finding.

  So a sequence is a project's film_specs in the order they were written, and
  a spec counts as rendered when some generation records it. Shots stay in the
  report as diagnostics, because how few of them are resolved to a chosen take
  is worth knowing on its own.

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

    /* The plan. This is the spine. */
    const { data: specs, error: specError } = await mine(
      supabase.from("film_specs").select("id, user_id, project_id, title, version, spec, created_at"),
    ).order("created_at", { ascending: true }).limit(limit);
    if (specError) {
      console.error("spine-gate could not read specs:", specError);
      return res.status(502).json({ error: "Could not read specs: " + specError.message });
    }
    if (!specs?.length) {
      return res.status(200).json({
        scope: everyone ? "all" : "mine",
        specs: { written: 0 }, projects: 0, usable: 0, percent: 0,
        reasons: [], note: "No Shot Specs written yet. Cover a scene in the Rehearsal Studio and this has something to read.",
      });
    }

    /* Which of those plans actually got filmed. A spec is rendered when some
       generation recorded it, whether or not any shot was ever resolved. */
    const specIdList = specs.map((x) => x.id);
    const { data: made, error: madeError } = await supabase
      .from("generations")
      .select("id, film_spec_id, status")
      .in("film_spec_id", specIdList);
    if (madeError) {
      console.error("spine-gate could not read generations:", madeError);
      return res.status(502).json({ error: "Could not read takes: " + madeError.message });
    }
    const renderedBySpec = new Map();
    for (const g of made ?? []) {
      if (!g.film_spec_id) continue;
      const have = renderedBySpec.get(g.film_spec_id);
      /* A finished take beats an unfinished one; otherwise first wins. */
      if (!have || (have.status !== "complete" && g.status === "complete")) {
        renderedBySpec.set(g.film_spec_id, g);
      }
    }

    /* Diagnostics only: shots are generation records, and how few are
       resolved to a keeper is a separate fact worth reporting. */
    const { data: shots } = await mine(
      supabase.from("shots").select("id, project_id, selected_generation_id"),
    ).limit(limit);

    /*
      How few shots are resolved to a keeper, reported because it is a real
      fact about the product and not because the spine needs it: a shot with
      no chosen take is a take nobody decided about.
    */
    const withTake = (shots ?? []).filter((x) => x.selected_generation_id).length;

    /* ---- group the plan into sequences, by project ---------------------- */
    const byProject = new Map();
    for (const row of specs) {
      const pid = row.project_id || "loose:" + row.user_id;
      if (!byProject.has(pid)) byProject.set(pid, []);
      const g = renderedBySpec.get(row.id) ?? null;
      byProject.get(pid).push({
        id: row.id,
        name: row.title || "Untitled shot",
        generationId: g?.id ?? null,
        specId: row.id,
        specVersion: row.version ?? null,
        spec: row.spec ?? null,
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
          project: pid.startsWith("loose:") ? "(specs with no project)" : pid,
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

    return res.status(200).json({
      scope: everyone ? "all" : "mine",
      projects,
      usable,
      percent: projects ? Math.round((usable / projects) * 100) : 0,
      minShots: MIN_SHOTS,
      specs: {
        written: specs.length,
        /* A plan somebody filmed. The rest are plans nobody has shot yet,
           which is a normal state and not a fault. */
        filmed: renderedBySpec.size,
      },
      shots: {
        recorded: (shots ?? []).length,
        withAChosenTake: withTake,
      },
      reasons: [...reasons.values()].sort((a, b) => b.count - a.count),
      examples,
    });
  } catch (error) {
    console.error("spine-gate failed:", error);
    return res.status(500).json({ error: "The measurement could not run." });
  }
}
