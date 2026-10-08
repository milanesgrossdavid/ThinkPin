"use server";

import {
  bookmarkCreated,
} from "../../lib/inngest/events";
import { inngest } from "../../lib/inngest/client";
import {
  enqueueMissingBookmarkEmbeddings,
  SearchReindexUnavailableError,
} from "../../lib/search/service";
import { isSupabaseAuthUnavailable } from "../../lib/supabase/auth-errors";
import { createClient } from "../../lib/supabase/server";

export type SearchReindexResult =
  | { ok: true; queued: number }
  | { ok: false; error: string };

export async function reindexMissingBookmarksAction(): Promise<SearchReindexResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (isSupabaseAuthUnavailable(authError)) {
      return {
        ok: false,
        error: "Authentication is temporarily unavailable. Please try again.",
      };
    }
    if (
      authError &&
      authError.status !== 401 &&
      authError.name !== "AuthSessionMissingError"
    ) {
      throw authError;
    }
    if (!user) {
      return { ok: false, error: "Authentication is required." };
    }

    const { queued } = await enqueueMissingBookmarkEmbeddings(
      supabase,
      user.id,
      async (bookmarkId, userId) => {
        await inngest.send(bookmarkCreated.create({ bookmarkId, userId }));
      },
    );
    return { ok: true, queued };
  } catch (error) {
    if (error instanceof SearchReindexUnavailableError) {
      return { ok: false, error: error.message };
    }
    console.error("Semantic bookmark indexing could not be queued.", error);
    return {
      ok: false,
      error: "Bookmarks could not be queued for semantic indexing.",
    };
  }
}
