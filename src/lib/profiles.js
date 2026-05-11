import { supabase } from "./supabase.js";

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  return {
    data: data ?? null,
    error: error ?? null,
  };
}

export async function upsertProfile(user, profile) {
  const row = {
    id: user.id,
    username: profile.username ?? "",
    display_name: profile.display_name ?? "",
    bio: profile.bio ?? "",
    avatar_url: profile.avatar_url ?? "",
    
  };

  const { data, error } = await supabase
  .from("profiles")
  .upsert(row, { onConflict: "id" })
.select("id, username, display_name, bio, avatar_url")
.maybeSingle();

  return {
    data: data ?? null,
    error: error ?? null,
  };
}

export function defaultProfile(user) {
  const handle = user.email?.split("@")[0] ?? "creator";

  return {
    username: handle,
    display_name: handle,
    bio: "",
    avatar_url: "",
  };
}