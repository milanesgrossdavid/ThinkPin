import type { SupabaseClient } from "@supabase/supabase-js";
import { creditPeriod, getBillingSubscription } from "./entitlements";
import { creditCosts, planCatalog, type CreditAction } from "./plans";

export class InsufficientCreditsError extends Error {
  constructor() {
    super("You've reached this month's AI credit limit.");
    this.name = "InsufficientCreditsError";
  }
}

export class CreditOperationInProgressError extends Error {
  constructor() {
    super("This request is already being processed.");
    this.name = "CreditOperationInProgressError";
  }
}

export class InvalidIdempotencyKeyError extends Error {
  constructor() {
    super("A valid Idempotency-Key is required for AI requests.");
    this.name = "InvalidIdempotencyKeyError";
  }
}

export type CreditReservation = {
  requestId: string;
  replayResult: unknown | null;
};

function validateRequestId(requestId: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      requestId,
    )
  ) {
    throw new InvalidIdempotencyKeyError();
  }
}

function isRpcReplay(value: unknown): value is {
  status: "pending" | "settled" | "released";
  result: unknown | null;
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    (value.status === "pending" ||
      value.status === "settled" ||
      value.status === "released") &&
    "result" in value
  );
}

export async function reserveAICredits(
  admin: SupabaseClient,
  userId: string,
  action: CreditAction,
  requestId: string,
): Promise<CreditReservation> {
  validateRequestId(requestId);
  const subscription = await getBillingSubscription(admin, userId);
  const { start, end } = creditPeriod(new Date(), subscription);
  const { data, error } = await admin.rpc("reserve_ai_credits", {
    p_user_id: userId,
    p_request_id: requestId,
    p_action: action,
    p_credits: creditCosts[action],
    p_monthly_limit: planCatalog[subscription.plan].monthlyCredits,
    p_period_start: start,
    p_period_end: end,
  });
  if (error) {
    if (error.code === "P0001" && error.message.includes("credit limit")) {
      throw new InsufficientCreditsError();
    }
    throw error;
  }
  if (isRpcReplay(data)) {
    if (data.status === "settled" && data.result !== null) {
      return { requestId, replayResult: data.result };
    }
    throw new CreditOperationInProgressError();
  }
  return { requestId, replayResult: null };
}

export async function settleAICredits(
  admin: SupabaseClient,
  userId: string,
  requestId: string,
  result: unknown,
  credits?: number,
) {
  const { error } = await admin.rpc("settle_ai_credits", {
    p_user_id: userId,
    p_request_id: requestId,
    p_actual_credits: credits ?? null,
    p_result: result,
  });
  if (error) throw error;
}

export async function releaseAICredits(
  admin: SupabaseClient,
  userId: string,
  requestId: string,
) {
  const { error } = await admin.rpc("release_ai_credits", {
    p_user_id: userId,
    p_request_id: requestId,
  });
  if (error) throw error;
}
