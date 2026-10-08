import type { SupabaseClient } from "@supabase/supabase-js";
import { checkLinkAvailability } from "../ingestion/metadata";

export async function checkAndSaveBookmarkLink(
  adminClient: SupabaseClient,
  bookmark: { id: string; url: string },
) {
  const result = await checkLinkAvailability(bookmark.url);
  const { error } = await adminClient.from("link_checks").insert({
    bookmark_id: bookmark.id,
    checked_url: bookmark.url,
    status: result.status,
    http_status: result.httpStatus,
    redirect_url: result.redirectUrl,
    response_time: result.responseTime,
    error: result.error,
  });
  if (error) throw error;
  return result;
}
