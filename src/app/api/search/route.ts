import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
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
import { checkEntitlement } from "../../../lib/billing/entitlements";
import {
  CreditOperationInProgressError,
  InsufficientCreditsError,
  releaseAICredits,
  reserveAICredits,
  settleAICredits,
} from "../../../lib/billing/credits";

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
    const usesSemantic = mode === "semantic" || mode === "hybrid";
    if (usesSemantic) {
      const access = await checkEntitlement(supabase, user.id, "semantic_search");
      if (!access.allowed) {
        return NextResponse.json(
          {
            error: "Semantic search is included with Pro.",
            code: "FEATURE_NOT_INCLUDED",
            requiredPlan: "pro",
          },
          { status: 403 },
        );
      }
    }

    const adminClient = embeddingProvider ? createAdminClient() : null;
    let result;
    if (usesSemantic) {
      if (!adminClient) {
        throw new Error("Semantic search requires the Supabase service configuration.");
      }
      const requestId = request.headers.get("idempotency-key") ?? "";
      const reservation = await reserveAICredits(
        adminClient,
        user.id,
        "semantic_search",
        requestId,
      );
      if (reservation.replayResult !== null) {
        return NextResponse.json(reservation.replayResult);
      }
      try {
        result = await searchUserBookmarks(
          supabase,
          adminClient,
          user.id,
          query,
          mode,
          filters,
        );
        await settleAICredits(adminClient, user.id, reservation.requestId, result);
      } catch (error) {
        try {
          await releaseAICredits(adminClient, user.id, reservation.requestId);
        } catch (releaseError) {
          console.error("Semantic search credit reservation could not be released.", releaseError);
        }
        throw error;
      }
    } else {
      result = await searchUserBookmarks(
        supabase,
        null,
        user.id,
        query,
        mode,
        filters,
      );
    }

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
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: error.message, code: "CREDITS_EXHAUSTED" },
        { status: 402 },
      );
    }
    if (error instanceof CreditOperationInProgressError) {
      return NextResponse.json(
        { error: error.message, code: "REQUEST_IN_PROGRESS" },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.name === "InvalidIdempotencyKeyError") {
      return NextResponse.json(
        { error: error.message, code: "IDEMPOTENCY_KEY_REQUIRED" },
        { status: 400 },
      );
    }
    console.error("Bookmark search failed.", error);
    Sentry.captureMessage("Bookmark search failed.", {
      level: "error",
      tags: { operation: "bookmark_search" },
    });
    return NextResponse.json(
      { error: "Search could not be completed." },
      { status: 500 },
    );
  }
}
