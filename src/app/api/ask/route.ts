import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { askUserLibrary, InvalidAskQuestionError } from "../../../lib/ask/service";
import { AskSearchIndexUnavailableError } from "../../../lib/ask/repository";
import { AIProviderUnavailableError } from "../../../lib/ai/types";
import { createAdminClient } from "../../../lib/supabase/admin";
import { createClient } from "../../../lib/supabase/server";
import {
  checkEntitlement,
} from "../../../lib/billing/entitlements";
import {
  CreditOperationInProgressError,
  InsufficientCreditsError,
  releaseAICredits,
  reserveAICredits,
  settleAICredits,
} from "../../../lib/billing/credits";
import {
  SupabaseAuthUnavailableError,
  throwIfSupabaseAuthUnavailable,
} from "../../../lib/supabase/auth-errors";

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
      !("question" in input)
    ) {
      return NextResponse.json(
        { error: "A question is required." },
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
    const requestId = request.headers.get("idempotency-key") ?? "";
    const reservation = await reserveAICredits(
      admin,
      user.id,
      "ai_search",
      requestId,
    );
    if (reservation.replayResult !== null) {
      return NextResponse.json(reservation.replayResult);
    }
    try {
      const response = await askUserLibrary(
        supabase,
        admin,
        user.id,
        input.question,
      );
      await settleAICredits(admin, user.id, reservation.requestId, response);
      return NextResponse.json(response);
    } catch (error) {
      try {
        await releaseAICredits(admin, user.id, reservation.requestId);
      } catch (releaseError) {
        console.error("Ask Your Library credit reservation could not be released.", releaseError);
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof SupabaseAuthUnavailableError) {
      console.warn("Ask Your Library could not reach Supabase Auth.");
      return NextResponse.json(
        { error: "Authentication is temporarily unavailable. Please try again." },
        { status: 503 },
      );
    }
    if (error instanceof InvalidAskQuestionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof AskSearchIndexUnavailableError) {
      console.error("Ask Your Library database migration is missing.", error);
      return NextResponse.json(
        { error: error.message, code: "ASK_SCHEMA_UNAVAILABLE" },
        { status: 503 },
      );
    }
    if (error instanceof AIProviderUnavailableError) {
      return NextResponse.json(
        { error: error.message, code: "AI_PROVIDER_UNAVAILABLE" },
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
    if (
      error instanceof Error &&
      error.name === "InvalidIdempotencyKeyError"
    ) {
      return NextResponse.json(
        { error: error.message, code: "IDEMPOTENCY_KEY_REQUIRED" },
        { status: 400 },
      );
    }
    console.error("Ask Your Library request failed.", error);
    Sentry.captureMessage("Ask Your Library request failed.", {
      level: "error",
      tags: { operation: "ask_library" },
    });
    return NextResponse.json(
      { error: "Your library could not be queried right now." },
      { status: 500 },
    );
  }
}
