import { NextResponse } from "next/server";
import {
  GlobalSearchProviderError,
  GlobalSearchUnavailableError,
  InvalidGlobalSearchQueryError,
  searchGlobalWeb,
} from "../../../../lib/ask/web-search";
import { createClient } from "../../../../lib/supabase/server";
import {
  SupabaseAuthUnavailableError,
  throwIfSupabaseAuthUnavailable,
} from "../../../../lib/supabase/auth-errors";

export async function POST(request: Request) {
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

    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      );
    }
    if (
      typeof input !== "object" ||
      input === null ||
      !("query" in input)
    ) {
      return NextResponse.json(
        { error: "A web search query is required." },
        { status: 400 },
      );
    }

    return NextResponse.json(await searchGlobalWeb(input.query));
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      console.warn("Global web search could not reach Supabase Auth.");
      return NextResponse.json(
        { error: "Authentication is temporarily unavailable. Please try again." },
        { status: 503 },
      );
    }
    if (error instanceof InvalidGlobalSearchQueryError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof GlobalSearchUnavailableError) {
      return NextResponse.json(
        { error: error.message, code: "GLOBAL_SEARCH_UNCONFIGURED" },
        { status: 503 },
      );
    }
    if (error instanceof GlobalSearchProviderError) {
      return NextResponse.json(
        { error: error.message, code: "GLOBAL_SEARCH_PROVIDER_ERROR" },
        { status: 502 },
      );
    }

    console.error("Global web search failed.", error);
    return NextResponse.json(
      { error: "Global search could not be completed." },
      { status: 500 },
    );
  }
}
