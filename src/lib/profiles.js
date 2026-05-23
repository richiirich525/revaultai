import { supabase } from "./supabase.js";

// ---------------------------------------------------------------------------
// Single profile
// ---------------------------------------------------------------------------

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, created_at")
    .eq("id", userId)
    .maybeSingle();

  return {
    data: data ?? null,
    error: error ?? null,
  };
}

export async function upsertProfile(user, profile) {
  const row = {
    id:           user.id,
    username:     profile.username     ?? "",
    display_name: profile.display_name ?? "",
    bio:          profile.bio          ?? "",
    // Accept either field name from callers so SettingsPage works
    // regardless of which key it passes in.
    avatar_url:   profile.avatar_url ?? profile.profile_image ?? "",
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "id" })
    .select("id, username, display_name, bio, avatar_url, created_at")
    .maybeSingle();

  return {
    data: data ?? null,
    error: error ?? null,
  };
}

export function defaultProfile(user) {
  const handle = user.email?.split("@")[0] ?? "creator";
  return {
    username:     handle,
    display_name: handle,
    bio:          "",
    avatar_url:   "",
  };
}

// ---------------------------------------------------------------------------
// All creators (for the Creators page)
// ---------------------------------------------------------------------------

/**
 * Fetch all profiles that have at least one published creation.
 * Returns { data: Profile[], error }
 *
 * Profile shape:
 *   { id, username, display_name, bio, avatar_url, created_at }
 */
export async function fetchCreators() {
  // Pull every profile that owns at least one non-pending creation.
  const { data: creationRows, error: cErr } = await supabase
    .from("creations")
    .select("user_id")
    .not("premium_status", "eq", "Pending")
    .not("user_id", "is", null);

  if (cErr) return { data: [], error: cErr };

  // Deduplicate user_ids
  const userIds = [...new Set(creationRows.map((r) => r.user_id))];
  if (userIds.length === 0) return { data: [], error: null };

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, created_at")
    .in("id", userIds)
    .order("created_at", { ascending: true });

  return {
    data: data ?? [],
    error: error ?? null,
  };
}

/**
 * Fetch a single profile by username (for the profile page).
 * Returns { data: Profile | null, error }
 */
export async function fetchProfileByUsername(username) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, created_at")
    .eq("username", username)
    .maybeSingle();

  return {
    data: data ?? null,
    error: error ?? null,
  };
}