"use server";

import { revalidatePath } from "next/cache";
import {
  createBookmark,
  deleteUserBookmark,
  getUserBookmark,
  InvalidBookmarkUrlError,
  updateUserBookmark,
} from "../../lib/bookmarks/service";
import type { BookmarkDetail, CreatedBookmark } from "../../lib/bookmarks/types";
import { bookmarkCreated } from "../../lib/inngest/events";
import { inngest } from "../../lib/inngest/client";
import { getAIProvider } from "../../lib/ai/router";
import { createAdminClient } from "../../lib/supabase/admin";
import { createClient } from "../../lib/supabase/server";
import {
  isSupabaseAuthUnavailable,
  throwIfSupabaseAuthUnavailable,
} from "../../lib/supabase/auth-errors";

export type SaveBookmarkActionResult =
  | {
      ok: true;
      duplicate: false;
      bookmark: CreatedBookmark;
      processingQueued: boolean;
    }
  | {
      ok: true;
      duplicate: true;
      bookmark: BookmarkDetail;
      processingQueued: boolean;
    }
  | {
      ok: false;
      code: "UNAUTHENTICATED" | "AUTH_UNAVAILABLE" | "INVALID_URL" | "SAVE_FAILED";
      error: string;
    };

export type BookmarkMutationResult =
  | { ok: true; bookmark?: BookmarkDetail }
  | {
      ok: false;
      code:
        | "UNAUTHENTICATED"
        | "AUTH_UNAVAILABLE"
        | "INVALID_INPUT"
        | "NOT_FOUND"
        | "SAVE_FAILED";
      error: string;
    };

async function authenticatedBookmarkClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  throwIfSupabaseAuthUnavailable(authError);

  if (
    authError &&
    authError.status !== 401 &&
    authError.name !== "AuthSessionMissingError"
  ) {
    throw authError;
  }

  return { supabase, user };
}

export async function saveBookmarkAction(
  url: unknown,
): Promise<SaveBookmarkActionResult> {
  try {
    const { supabase, user } = await authenticatedBookmarkClient();
    if (!user) {
      return {
        ok: false,
        code: "UNAUTHENTICATED",
        error: "Authentication is required.",
      };
    }

    const result = await createBookmark(
      {
        userClient: supabase,
        userId: user.id,
        createAdminClient,
        enrichMissingTags: getAIProvider("bookmark-enrichment") !== null,
        publishCreated: async (bookmarkId, userId) => {
          await inngest.send(
            bookmarkCreated.create({ bookmarkId, userId }),
          );
        },
      },
      url,
    );

    revalidatePath("/app/bookmarks");
    revalidatePath("/app");

    if (result.duplicate) {
      const bookmark = await getUserBookmark(
        supabase,
        user.id,
        result.bookmarkId,
      );
      if (!bookmark) {
        throw new Error("Duplicate bookmark could not be loaded.");
      }

      return {
        ok: true,
        duplicate: true,
        bookmark,
        processingQueued: result.processingQueued,
      };
    }

    return {
      ok: true,
      duplicate: false,
      bookmark: result.bookmark,
      processingQueued: result.processingQueued,
    };
  } catch (error) {
    if (isSupabaseAuthUnavailable(error)) {
      return {
        ok: false,
        code: "AUTH_UNAVAILABLE",
        error: "Authentication is temporarily unavailable. Please try again.",
      };
    }
    if (error instanceof InvalidBookmarkUrlError) {
      return { ok: false, code: "INVALID_URL", error: error.message };
    }

    console.error("Bookmark save action failed.", error);
    return {
      ok: false,
      code: "SAVE_FAILED",
      error: "Bookmark could not be saved.",
    };
  }
}

export async function updateBookmarkAction(
  bookmarkId: string,
  updates: unknown,
): Promise<BookmarkMutationResult> {
  try {
    if (typeof bookmarkId !== "string" || !bookmarkId) {
      throw new TypeError("Bookmark ID is invalid.");
    }
    const { supabase, user } = await authenticatedBookmarkClient();
    if (!user) {
      return {
        ok: false,
        code: "UNAUTHENTICATED",
        error: "Authentication is required.",
      };
    }

    const bookmark = await updateUserBookmark(
      supabase,
      user.id,
      bookmarkId,
      updates,
    );
    if (!bookmark) {
      return {
        ok: false,
        code: "NOT_FOUND",
        error: "Bookmark not found.",
      };
    }

    revalidatePath("/app/bookmarks");
    revalidatePath(`/app/bookmarks/${bookmarkId}`);
    revalidatePath("/app/favorites");
    revalidatePath("/app");
    return { ok: true, bookmark };
  } catch (error) {
    if (isSupabaseAuthUnavailable(error)) {
      return {
        ok: false,
        code: "AUTH_UNAVAILABLE",
        error: "Authentication is temporarily unavailable. Please try again.",
      };
    }
    if (error instanceof TypeError) {
      return { ok: false, code: "INVALID_INPUT", error: error.message };
    }

    console.error("Bookmark update action failed.", { bookmarkId, error });
    return {
      ok: false,
      code: "SAVE_FAILED",
      error: "Bookmark could not be updated.",
    };
  }
}

export async function deleteBookmarkAction(
  bookmarkId: string,
): Promise<BookmarkMutationResult> {
  try {
    if (typeof bookmarkId !== "string" || !bookmarkId) {
      return {
        ok: false,
        code: "INVALID_INPUT",
        error: "Bookmark ID is invalid.",
      };
    }

    const { supabase, user } = await authenticatedBookmarkClient();
    if (!user) {
      return {
        ok: false,
        code: "UNAUTHENTICATED",
        error: "Authentication is required.",
      };
    }
    const deleted = await deleteUserBookmark(supabase, user.id, bookmarkId);
    if (!deleted) {
      return {
        ok: false,
        code: "NOT_FOUND",
        error: "Bookmark not found.",
      };
    }

    revalidatePath("/app/bookmarks");
    revalidatePath(`/app/bookmarks/${bookmarkId}`);
    revalidatePath("/app/favorites");
    revalidatePath("/app");
    return { ok: true };
  } catch (error) {
    if (isSupabaseAuthUnavailable(error)) {
      return {
        ok: false,
        code: "AUTH_UNAVAILABLE",
        error: "Authentication is temporarily unavailable. Please try again.",
      };
    }
    console.error("Bookmark deletion action failed.", { bookmarkId, error });
    return {
      ok: false,
      code: "SAVE_FAILED",
      error: "Bookmark could not be deleted.",
    };
  }
}
