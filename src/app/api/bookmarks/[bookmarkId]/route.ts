import { NextResponse } from "next/server";
import {
  deleteUserBookmark,
  getUserBookmark,
  updateUserBookmark,
} from "../../../../lib/bookmarks/service";
import { createClient } from "../../../../lib/supabase/server";

type RouteContext = {
  params: Promise<{ bookmarkId: string }>;
};

async function authenticate() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (
    authError &&
    authError.status !== 401 &&
    authError.name !== "AuthSessionMissingError"
  ) {
    throw authError;
  }

  return { supabase, user };
}

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

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { bookmarkId } = await params;
    const { supabase, user } = await authenticate();
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
    const { supabase, user } = await authenticate();
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

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { bookmarkId } = await params;
    const { supabase, user } = await authenticate();
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
    console.error("Bookmark deletion failed.", error);
    return NextResponse.json(
      { error: "Bookmark could not be deleted." },
      { status: 500 },
    );
  }
}