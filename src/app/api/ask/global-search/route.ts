import { NextResponse } from "next/server";
import {
  GlobalSearchProviderError,
  GlobalSearchUnavailableError,
  InvalidGlobalSearchQueryError,
  searchGlobalWeb,
} from "../../../../lib/ask/web-search";
import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { checkEntitlement } from "../../../../lib/billing/entitlements";
import {
  CreditOperationInProgressError,
  InsufficientCreditsError,
  releaseAICredits,
  reserveAICredits,
  settleAICredits,
} from "../../../../lib/billing/credits";
import { recordProviderUsage } from "../../../../lib/ai/usage";
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

    const access = await checkEntitlement(supabase, user.id, "ai_assistant");
    if (!access.allowed) {
      return NextResponse.json(
        {
          error: "Ask Your Library is included with Pro.",
          code: "FEATURE_NOT_INCLUDED",
          requiredPlan: "pro",
        },
        { status: 403 },
      );
    }

    const admin = createAdminClient();
    const reservation = await reserveAICredits(
      admin,
      user.id,
      "ai_search",
      request.headers.get("idempotency-key") ?? "",
    );
    if (reservation.replayResult !== null) {
      if (
        typeof reservation.replayResult === "object" &&
        reservation.replayResult !== null &&
        "query" in reservation.replayResult &&
        typeof reservation.replayResult.query === "string" &&
        "results" in reservation.replayResult &&
        Array.isArray(reservation.replayResult.results)
      ) {
        return NextResponse.json(reservation.replayResult);
      }
      throw new Error("The previous global search result could not be recovered.");
    }
    try {
      const response = await searchGlobalWeb(input.query);
      await settleAICredits(admin, user.id, reservation.requestId, response);
      try {
        await recordProviderUsage(admin, {
          userId: user.id,
          provider: "tavily",
          model: "basic-search",
          actionType: "global_search",
          providerCredits: response.providerCredits,
          estimatedCostUsd: response.estimatedCostUsd,
          requestId: reservation.requestId,
        });
      } catch (usageError) {
        console.error("Tavily provider usage could not be recorded.", usageError);
      }
      return NextResponse.json({
        query: response.query,
        results: response.results,
      });
    } catch (error) {
      try {
        await releaseAICredits(admin, user.id, reservation.requestId);
      } catch (releaseError) {
        console.error("Global search credit reservation could not be released.", releaseError);
      }
      throw error;
    }
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

    console.error("Global web search failed.", error);
    return NextResponse.json(
      { error: "Global search could not be completed." },
      { status: 500 },
    );
  }
}
