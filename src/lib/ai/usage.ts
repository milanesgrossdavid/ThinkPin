import type { SupabaseClient } from "@supabase/supabase-js";

export type ProviderUsageInput = {
  userId: string;
  provider: string;
  model: string;
  actionType:
    | "bookmark_tagging"
    | "semantic_search"
    | "ai_search"
    | "ai_answer"
    | "global_search"
    | "embedding";
  inputTokens?: number;
  outputTokens?: number;
  providerCredits?: number | null;
  estimatedCostUsd?: number | null;
  requestId?: string | null;
};

export async function recordProviderUsage(
  supabase: SupabaseClient,
  input: ProviderUsageInput,
) {
  const { error } = await supabase.from("ai_usage").insert({
    user_id: input.userId,
    provider: input.provider,
    model: input.model,
    action_type: input.actionType,
    input_tokens: input.inputTokens ?? 0,
    output_tokens: input.outputTokens ?? 0,
    provider_credits: input.providerCredits ?? null,
    estimated_cost_usd: input.estimatedCostUsd ?? null,
    request_id: input.requestId ?? null,
  });
  if (error) throw error;
}

export function getTavilyCostPerCreditUsd(): number | null {
  const value = process.env.TAVILY_COST_PER_CREDIT_USD?.trim();
  if (!value) return null;

  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(
      "TAVILY_COST_PER_CREDIT_USD must be a non-negative USD amount.",
    );
  }
  return amount;
}
