"use server";

import { revalidatePath } from "next/cache";
import { linkCheckRequested } from "../../lib/inngest/events";
import { inngest } from "../../lib/inngest/client";
import { normalizeUrl } from "../../lib/ingestion/normalize-url";
import {
  InvalidBookmarkUrlError,
  validateBookmarkUrl,
} from "../../lib/bookmarks/validate-url";
import { createClient } from "../../lib/supabase/server";

export type LinkHealthActionResult =
  | { ok: true; queued?: boolean; message?: string }
  | { ok: false; error: string };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return { supabase, user };
}

export async function requestBookmarkLinkCheckAction(
  bookmarkId: string,
): Promise<LinkHealthActionResult> {
  if (!isUuid(bookmarkId)) {
    return { ok: false, error: "Invalid bookmark." };
  }

  try {
    const { supabase, user } = await getAuthenticatedUser();
    if (!user) return { ok: false, error: "Authentication is required." };

    const { data: bookmark, error } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("id", bookmarkId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!bookmark) return { ok: false, error: "Bookmark not found." };

    await inngest.send(
      linkCheckRequested.create({ bookmarkId, userId: user.id }),
    );
    revalidatePath("/app/library-health");
    return { ok: true, queued: true, message: "Link check queued." };
  } catch (error) {
    console.error("Could not queue a link health check.", {
      bookmarkId,
      error,
    });
    return {
      ok: false,
      error: "Could not queue the link check. Please try again.",
    };
  }
}

export async function updateBookmarkHealthUrlAction(
  bookmarkId: string,
  value: string,
): Promise<LinkHealthActionResult> {
  if (!isUuid(bookmarkId)) {
    return { ok: false, error: "Invalid bookmark." };
  }

  let validated: ReturnType<typeof validateBookmarkUrl>;
  try {
    validated = validateBookmarkUrl(value);
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof InvalidBookmarkUrlError
          ? error.message
          : "Enter a valid HTTP(S) URL.",
    };
  }

  try {
    const { supabase, user } = await getAuthenticatedUser();
    if (!user) return { ok: false, error: "Authentication is required." };
    const normalizedUrl = normalizeUrl(validated.normalizedUrl);
    const { data: bookmark, error } = await supabase
      .from("bookmarks")
      .update({
        url: validated.normalizedUrl,
        normalized_url: normalizedUrl,
        canonical_url: normalizedUrl,
        domain: new URL(validated.normalizedUrl).hostname,
      })
      .eq("id", bookmarkId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();
    if (error) {
      if (error.code === "23505") {
        return {
          ok: false,
          error: "Another bookmark in your library already uses this URL.",
        };
      }
      throw error;
    }
    if (!bookmark) return { ok: false, error: "Bookmark not found." };

    revalidatePath("/app/library-health");
    revalidatePath("/app/bookmarks");
    revalidatePath(`/app/bookmarks/${bookmarkId}`);

    try {
      await inngest.send(
        linkCheckRequested.create({ bookmarkId, userId: user.id }),
      );
      return {
        ok: true,
        queued: true,
        message: "URL updated. A fresh link check was queued.",
      };
    } catch (error) {
      console.error("Bookmark URL was updated but its check was not queued.", {
        bookmarkId,
        error,
      });
      return {
        ok: true,
        queued: false,
        message: "URL updated, but the new link check could not be queued.",
      };
    }
  } catch (error) {
    console.error("Bookmark URL could not be updated.", { bookmarkId, error });
    return {
      ok: false,
      error: "Could not update the bookmark URL. Please try again.",
    };
  }
}

export async function archiveLinkHealthBookmarkAction(
  bookmarkId: string,
): Promise<LinkHealthActionResult> {
  if (!isUuid(bookmarkId)) {
    return { ok: false, error: "Invalid bookmark." };
  }

  try {
    const { supabase, user } = await getAuthenticatedUser();
    if (!user) return { ok: false, error: "Authentication is required." };
    const { data, error } = await supabase
      .from("bookmarks")
      .update({ is_archived: true })
      .eq("id", bookmarkId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, error: "Bookmark not found." };

    revalidatePath("/app/library-health");
    revalidatePath("/app/bookmarks");
    revalidatePath("/app");
    return { ok: true };
  } catch (error) {
    console.error("Bookmark could not be archived from Library Health.", {
      bookmarkId,
      error,
    });
    return {
      ok: false,
      error: "Could not archive this bookmark. Please try again.",
    };
  }
}
