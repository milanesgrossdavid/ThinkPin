import { NextResponse } from "next/server";
import {
  createBookmark,
  InvalidBookmarkUrlError,
  listUserBookmarks,
} from "../../../lib/bookmarks/service";
import { inngest } from "../../../lib/inngest/client";
import { bookmarkCreated } from "../../../lib/inngest/events";
import { getAIProvider } from "../../../lib/ai/router";
import { createAdminClient } from "../../../lib/supabase/admin";
import { createClient } from "../../../lib/supabase/server";
import {
  SupabaseAuthUnavailableError,
  throwIfSupabaseAuthUnavailable,
} from "../../../lib/supabase/auth-errors";

async function getAuthenticatedUser() {
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

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication is required." },
        { status: 401 },
      );
    }

    const bookmarks = await listUserBookmarks(supabase, user.id);
    return NextResponse.json({
      bookmarks: bookmarks.map((bookmark) => ({
        id: bookmark.id,
        url: bookmark.url,
        canonical_url: bookmark.canonicalUrl,
        title: bookmark.title,
        description: bookmark.description,
        domain: bookmark.domain,
        favicon_url: bookmark.faviconUrl,
        image_url: bookmark.imageUrl,
        content_type: bookmark.contentType,
        intent: bookmark.intent,
        is_favorite: bookmark.isFavorite,
        is_archived: bookmark.isArchived,
        is_read: bookmark.isRead,
        content_status: bookmark.contentStatus,
        saved_reason: bookmark.savedReason,
        created_at: bookmark.createdAt,
        tags: bookmark.tags,
        collection: bookmark.collection,
        notes: bookmark.notes,
      })),
    });
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      console.warn("Bookmark request could not reach Supabase Auth.");
      return NextResponse.json(
        { error: "Authentication is temporarily unavailable. Please try again." },
        { status: 503 },
      );
    }
    console.error("Bookmark list failed.", error);
    return NextResponse.json(
      { error: "Bookmarks could not be loaded." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication is required." },
        { status: 401 },
      );
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      );
    }

    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload) ||
      !("url" in payload) ||
      Object.keys(payload).length !== 1
    ) {
      return NextResponse.json(
        { error: "Request body must contain only a URL." },
        { status: 400 },
      );
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
      payload.url,
    );

    if (result.duplicate) {
      return NextResponse.json(
        {
          code: "BOOKMARK_ALREADY_EXISTS",
          bookmarkId: result.bookmarkId,
          processingQueued: result.processingQueued,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        bookmark: {
          id: result.bookmark.id,
          url: result.bookmark.url,
          canonicalUrl: result.bookmark.canonicalUrl,
          domain: result.bookmark.domain,
          title: result.bookmark.domain,
          description: null,
          contentStatus: result.processingQueued
            ? result.bookmark.contentStatus
            : "failed",
          processingQueued: result.processingQueued,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      console.warn("Bookmark request could not reach Supabase Auth.");
      return NextResponse.json(
        { error: "Authentication is temporarily unavailable. Please try again." },
        { status: 503 },
      );
    }
    if (error instanceof InvalidBookmarkUrlError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Bookmark creation failed.", error);
    return NextResponse.json(
      { error: "Bookmark could not be saved." },
      { status: 500 },
    );
  }
}
