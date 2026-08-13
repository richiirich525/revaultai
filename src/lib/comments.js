// src/lib/comments.js — data layer for film comments.
import { supabase } from "./supabase.js";

export async function fetchComments(creationId) {
  return await supabase
    .from("comments")
    .select("id, body, created_at, user_id, profiles:user_id (username, display_name, avatar_url)")
    .eq("creation_id", creationId)
    .order("created_at", { ascending: false })
    .limit(200);
}

export async function insertComment(creationId, userId, body) {
  return await supabase
    .from("comments")
    .insert({ creation_id: creationId, user_id: userId, body })
    .select("id, body, created_at, user_id, profiles:user_id (username, display_name, avatar_url)")
    .single();
}

export async function deleteComment(id) {
  return await supabase.from("comments").delete().eq("id", id);
}

// Creator toggle — RLS on `creations` already restricts updates to the owner.
export async function updateCommentsEnabled(creationId, enabled) {
  return await supabase.from("creations").update({ comments_enabled: enabled }).eq("id", creationId);
}