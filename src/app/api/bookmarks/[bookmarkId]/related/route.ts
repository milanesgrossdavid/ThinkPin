import { NextResponse } from "next/server";
import {
  getRelatedBookmarks,
  InvalidRelatedBookmarkIdError,
  RelatedBookmarkNotFoundError,
  RelatedSearchIndexUnavailableError,
} from "../../../../../lib/search/related";
import { createClient } from "../../../../../lib/supabase/server";
import {
  SupabaseAuthUnavailableError,
  throwIfSupabaseAuthUnavailable,
} from "../../../../../lib/supabase/auth-errors";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { bookmarkCreated } from "../../../../../lib/inngest/events";
import { inngest } from "../../../../../lib/inngest/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bookmarkId: string }> },
) {
  try {
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
    if (!user) {
      return NextResponse.json(
        { error: "Authentication is required." },
        { status: 401 },
      );
    }

    const { bookmarkId } = await params;
    return NextResponse.json(
      await getRelatedBookmarks(
        supabase,
        user.id,
        bookmarkId,
        {
          adminClient: createAdminClient(),
          publishCreated: async (queuedBookmarkId, userId) => {
            await inngest.send(
              bookmarkCreated.create({
                bookmarkId: queuedBookmarkId,
                userId,
              }),
            );
          },
        },
        new URL(request.url).searchParams.get("retryIndex") === "true",
      ),
    );
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      console.warn("Related bookmark search could not reach Supabase Auth.");
      return NextResponse.json(
        { error: "Authentication is temporarily unavailable. Please try again." },
        { status: 503 },
      );
    }
    if (error instanceof InvalidRelatedBookmarkIdError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof RelatedBookmarkNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof RelatedSearchIndexUnavailableError) {
      console.error("Related bookmark database migration is missing.", error);
      return NextResponse.json(
        { error: error.message, code: "RELATED_SEARCH_SCHEMA_UNAVAILABLE" },
        { status: 503 },
      );
    }
    console.error("Related bookmark search failed.", error);
    return NextResponse.json(
      { error: "Related bookmarks could not be loaded." },
      { status: 500 },
    );
  }
}
