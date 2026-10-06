import { NextResponse } from "next/server";
import { createBookmark } from "../../../lib/bookmarks/repository";
import {
  InvalidBookmarkUrlError,
  validateBookmarkUrl,
} from "../../../lib/bookmarks/validate-url";
import { createClient } from "../../../lib/supabase/server";

export async function POST(request: Request) {
  try {
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

    let bookmarkUrl: ReturnType<typeof validateBookmarkUrl>;
    try {
      bookmarkUrl = validateBookmarkUrl(payload.url);
    } catch (error) {
      if (error instanceof InvalidBookmarkUrlError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    const result = await createBookmark(supabase, {
      ...bookmarkUrl,
      userId: user.id,
    });

    if (result.duplicate) {
      return NextResponse.json(
        {
          code: "BOOKMARK_ALREADY_EXISTS",
          bookmarkId: result.bookmarkId,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        bookmark: {
          id: result.bookmark.id,
          url: result.bookmark.url,
          canonicalUrl: result.bookmark.canonical_url,
          domain: result.bookmark.domain,
          contentStatus: result.bookmark.content_status,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Bookmark creation failed.", error);
    return NextResponse.json(
      { error: "Bookmark could not be saved." },
      { status: 500 },
    );
  }
}
