import type { SupabaseClient } from "@supabase/supabase-js";

type FindContentDuplicateInput = {
  userId: string;
  currentBookmarkId: string;
  contentHash: string;
};

export async function findContentDuplicate(
  supabase: SupabaseClient,
  input: FindContentDuplicateInput,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("content_documents")
    .select("bookmark_id, bookmarks!inner(user_id)")
    .eq("content_hash", input.contentHash)
    .eq("bookmarks.user_id", input.userId)
    .neq("bookmark_id", input.currentBookmarkId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.bookmark_id ?? null;
}
