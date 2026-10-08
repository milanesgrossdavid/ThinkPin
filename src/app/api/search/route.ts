import { NextResponse } from "next/server";
import {
  InvalidSearchError,
  parseSearchFilters,
  searchUserBookmarks,
} from "../../../lib/search/service";
import { createAdminClient } from "../../../lib/supabase/admin";
import { createClient } from "../../../lib/supabase/server";
import {
  SupabaseAuthUnavailableError,
  throwIfSupabaseAuthUnavailable,
} from "../../../lib/supabase/auth-errors";
import { AIProviderUnavailableError } from "../../../lib/ai/types";
import { getAIProvider } from "../../../lib/ai/router";

export async function GET(request: Request) {
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

    const params = new URL(request.url).searchParams;
    const query = params.get("q");
    const mode = params.get("mode") ?? "keyword";
    const filters = parseSearchFilters({
      contentType: params.get("contentType"),
      favorite: params.get("favorite"),
      read: params.get("read"),
      collection: params.get("collection"),
      tag: params.get("tag"),
      createdAfter: params.get("createdAfter"),
    });
    const embeddingProvider =
      mode === "semantic" || mode === "hybrid"
        ? getAIProvider("embedding")
        : null;
    const result = await searchUserBookmarks(
      supabase,
      embeddingProvider ? createAdminClient() : null,
      user.id,
      query,
      mode,
      filters,
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      console.warn("Search request could not reach Supabase Auth.");
      return NextResponse.json(
        { error: "Authentication is temporarily unavailable. Please try again." },
        { status: 503 },
      );
    }
    if (error instanceof InvalidSearchError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof AIProviderUnavailableError) {
      return NextResponse.json(
        { error: error.message, code: "EMBEDDING_PROVIDER_UNAVAILABLE" },
        { status: 503 },
      );
    }
    console.error("Bookmark search failed.", error);
    return NextResponse.json(
      { error: "Search could not be completed." },
      { status: 500 },
    );
  }
}
