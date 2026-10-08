"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";

export type ResurfacingFeedbackStatus = "rediscovered" | "dismissed";

export type ResurfacingFeedbackResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveResurfacingFeedback(
  bookmarkId: string,
  status: ResurfacingFeedbackStatus,
): Promise<ResurfacingFeedbackResult> {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      bookmarkId,
    ) ||
    (status !== "rediscovered" && status !== "dismissed")
  ) {
    return { ok: false, error: "Invalid resurfacing action." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) return { ok: false, error: "Authentication is required." };

  const { error } = await supabase.from("resurfacing_feedback").upsert(
    {
      user_id: user.id,
      bookmark_id: bookmarkId,
      status,
    },
    { onConflict: "user_id,bookmark_id" },
  );
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") {
      return {
        ok: false,
        error:
          "Smart Resurfacing needs its database migration. Apply the latest Supabase migrations and try again.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/app");
  revalidatePath(`/app/bookmarks/${bookmarkId}`);
  return { ok: true };
}
