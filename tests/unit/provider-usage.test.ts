import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getTavilyCostPerCreditUsd,
  recordProviderUsage,
} from "../../src/lib/ai/usage";

describe("provider cost tracking", () => {
  const originalTavilyRate = process.env.TAVILY_COST_PER_CREDIT_USD;

  afterEach(() => {
    if (originalTavilyRate === undefined) {
      delete process.env.TAVILY_COST_PER_CREDIT_USD;
    } else {
      process.env.TAVILY_COST_PER_CREDIT_USD = originalTavilyRate;
    }
  });

  it("persists provider tokens, units, and estimated cost separately from app credits", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ insert }));

    await recordProviderUsage({ from } as unknown as SupabaseClient, {
      userId: "user-1",
      provider: "tavily",
      model: "basic-search",
      actionType: "global_search",
      providerCredits: 1,
      estimatedCostUsd: 0.008,
      requestId: "request-1",
    });

    expect(from).toHaveBeenCalledWith("ai_usage");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        action_type: "global_search",
        provider_credits: 1,
        estimated_cost_usd: 0.008,
      }),
    );
  });

  it("leaves Tavily cost unknown unless an effective per-credit rate is configured", () => {
    delete process.env.TAVILY_COST_PER_CREDIT_USD;
    expect(getTavilyCostPerCreditUsd()).toBeNull();

    process.env.TAVILY_COST_PER_CREDIT_USD = "0.0075";
    expect(getTavilyCostPerCreditUsd()).toBe(0.0075);
  });
});
