import { supabase } from "./supabase.js";

// ---------------------------------------------------------------------------
// Single profile
// ---------------------------------------------------------------------------

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, tip_url, hire_url, tool_links, social_links, created_at")
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
    tip_url:      profile.tip_url      ?? "",
    hire_url:     profile.hire_url     ?? "",
    tool_links:   profile.tool_links   ?? [],
    social_links: profile.social_links ?? {},
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "id" })
    .select("id, username, display_name, bio, avatar_url, tip_url, hire_url, tool_links, social_links, created_at")
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
    tip_url:      "",
    hire_url:     "",
    tool_links:   [],
    social_links: {},
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
    .or("premium_status.is.null,premium_status.eq.Approved")
    .not("user_id", "is", null);

  if (cErr) return { data: [], error: cErr };

  // Deduplicate user_ids
  const userIds = [...new Set(creationRows.map((r) => r.user_id))];
  if (userIds.length === 0) return { data: [], error: null };

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, tip_url, created_at")
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
    .select("id, username, display_name, bio, avatar_url, tip_url, hire_url, tool_links, social_links, created_at")
    .eq("username", username)
    .maybeSingle();

  return {
    data: data ?? null,
    error: error ?? null,
  };
}
// ---------------------------------------------------------------------------
// Creator stats
// ---------------------------------------------------------------------------

export async function fetchCreatorStats(userId) {
  if (!userId) return { data: null, error: null };

  const { data, error } = await supabase
    .from("creations")
    .select("id, is_premium, premium_status")
    .eq("user_id", userId);

  if (error) return { data: null, error };

  const visible = data.filter(
    (c) => c.premium_status === "Approved" || c.premium_status === null
  );
  const premiumCount = visible.filter((c) => c.is_premium).length;
  const openCount    = visible.filter((c) => !c.is_premium).length;

  return {
    data: { total: visible.length, premium: premiumCount, open: openCount },
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Follows
// ---------------------------------------------------------------------------

export async function fetchFollowerCount(creatorUserId) {
  if (!creatorUserId) return { count: 0, error: null };
  const { count, error } = await supabase
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("creator_user_id", creatorUserId);
  return { count: count ?? 0, error: error ?? null };
}

export async function fetchIsFollowing(followerUserId, creatorUserId) {
  if (!followerUserId || !creatorUserId) return { isFollowing: false, error: null };
  const { data, error } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_user_id", followerUserId)
    .eq("creator_user_id", creatorUserId)
    .maybeSingle();
  return { isFollowing: !!data, error: error ?? null };
}

export async function followCreator(followerUserId, creatorUserId) {
  const { error } = await supabase
    .from("follows")
    .insert({ follower_user_id: followerUserId, creator_user_id: creatorUserId });
  return { error: error ?? null };
}

export async function unfollowCreator(followerUserId, creatorUserId) {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_user_id", followerUserId)
    .eq("creator_user_id", creatorUserId);
  return { error: error ?? null };
}

// ---------------------------------------------------------------------------
// Username availability
// ---------------------------------------------------------------------------

export async function checkUsernameAvailable(username, currentUserId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", currentUserId)
    .maybeSingle();
  if (error) return { available: false, error };
  return { available: !data, error: null };
}

// ---------------------------------------------------------------------------
// Avatar upload to Supabase Storage
// ---------------------------------------------------------------------------

export async function uploadAvatar(userId, file) {
  const ext = file.name.split(".").pop();
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { url: null, error: uploadError };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  // Add cache-busting so the browser picks up the new image
  const url = `${data.publicUrl}?t=${Date.now()}`;
  return { url, error: null };
}