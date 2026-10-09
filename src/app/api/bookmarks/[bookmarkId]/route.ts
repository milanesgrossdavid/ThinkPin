import { NextResponse } from "next/server";
import {
  deleteUserBookmark,
  getUserBookmark,
  updateUserBookmark,
} from "../../../../lib/bookmarks/service";
import { authenticateSupabaseRequest } from "../../../../lib/supabase/authenticate-request";
import {
  SupabaseAuthUnavailableError,
} from "../../../../lib/supabase/auth-errors";

type RouteContext = {
  params: Promise<{ bookmarkId: string }>;
};

function serializeBookmark(bookmark: NonNullable<Awaited<ReturnType<typeof getUserBookmark>>>) {
  return {
    id: bookmark.id,
    url: bookmark.url,
    canonical_url: bookmark.canonicalUrl,
    title: bookmark.title,
    description: bookmark.description,
    domain: bookmark.domain,
    image_url: bookmark.imageUrl,
    favicon_url: bookmark.faviconUrl,
    content_status: bookmark.contentStatus,
    content_type: bookmark.contentType,
    intent: bookmark.intent,
    saved_reason: bookmark.savedReason,
    created_at: bookmark.createdAt,
    tags: bookmark.tags,
    collection: bookmark.collection,
    notes: bookmark.notes,
  };
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new TypeError("Request body must be valid JSON.");
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { bookmarkId } = await params;
    const { supabase, user } = await authenticateSupabaseRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication is required." },
        { status: 401 },
      );
    }

    const bookmark = await getUserBookmark(supabase, user.id, bookmarkId);
    if (!bookmark) {
      return NextResponse.json({ error: "Bookmark not found." }, { status: 404 });
    }

    return NextResponse.json({ bookmark: serializeBookmark(bookmark) });
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      console.warn("Bookmark request could not reach Supabase Auth.");
      return NextResponse.json(
        { error: "Authentication is temporarily unavailable. Please try again." },
        { status: 503 },
      );
    }
    console.error("Bookmark lookup failed.", error);
    return NextResponse.json(
      { error: "Bookmark could not be loaded." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { bookmarkId } = await params;
    const { supabase, user } = await authenticateSupabaseRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication is required." },
        { status: 401 },
      );
    }

    const updates = await readJson(request);
    const bookmark = await updateUserBookmark(
      supabase,
      user.id,
      bookmarkId,
      updates,
    );
    if (!bookmark) {
      return NextResponse.json({ error: "Bookmark not found." }, { status: 404 });
    }

    return NextResponse.json({ bookmark: serializeBookmark(bookmark) });
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      console.warn("Bookmark request could not reach Supabase Auth.");
      return NextResponse.json(
        { error: "Authentication is temporarily unavailable. Please try again." },
        { status: 503 },
      );
    }
    if (error instanceof TypeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Bookmark update failed.", error);
    return NextResponse.json(
      { error: "Bookmark could not be updated." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { bookmarkId } = await params;
    const { supabase, user } = await authenticateSupabaseRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication is required." },
        { status: 401 },
      );
    }

    const deleted = await deleteUserBookmark(supabase, user.id, bookmarkId);
    if (!deleted) {
      return NextResponse.json({ error: "Bookmark not found." }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      console.warn("Bookmark request could not reach Supabase Auth.");
      return NextResponse.json(
        { error: "Authentication is temporarily unavailable. Please try again." },
        { status: 503 },
      );
    }
    console.error("Bookmark deletion failed.", error);
    return NextResponse.json(
      { error: "Bookmark could not be deleted." },
      { status: 500 },
    );
  }
}