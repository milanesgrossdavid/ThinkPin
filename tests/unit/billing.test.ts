import { describe, expect, it, vi } from "vitest";
import { creditPeriod, checkEntitlement } from "../../src/lib/billing/entitlements";
import { creditCosts, planCatalog } from "../../src/lib/billing/plans";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("billing permissions and credits", () => {
  it("provides expected credit costs and plan limits", () => {
    expect(creditCosts.ai_search).toBe(5);
    expect(creditCosts.research_analysis).toBe(30);
    expect(planCatalog.free.monthlyCredits).toBe(500);
    expect(planCatalog.pro.monthlyCredits).toBe(2_000);
  });

  it("uses an active paid subscription period when it contains now", () => {
    const subscription = {
      plan: "pro" as const,
      status: "active",
      currentPeriodStart: "2026-10-01T00:00:00.000Z",
      currentPeriodEnd: "2026-11-01T00:00:00.000Z",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    };

    expect(creditPeriod(new Date("2026-10-10T12:00:00.000Z"), subscription)).toEqual({
      start: subscription.currentPeriodStart,
      end: subscription.currentPeriodEnd,
    });
  });

  it("falls back to the UTC calendar month outside the paid period", () => {
    expect(creditPeriod(new Date("2026-10-10T12:00:00.000Z"), {
      plan: "pro",
      status: "active",
      currentPeriodStart: "2026-09-01T00:00:00.000Z",
      currentPeriodEnd: "2026-10-01T00:00:00.000Z",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    })).toEqual({
      start: "2026-10-01T00:00:00.000Z",
      end: "2026-11-01T00:00:00.000Z",
    });
  });

  it("applies features from the authenticated user's plan", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        plan: "pro",
        status: "active",
        current_period_start: null,
        current_period_end: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
      },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const supabase = { from } as unknown as SupabaseClient;

    await expect(checkEntitlement(supabase, "user-1", "ai_assistant")).resolves.toMatchObject({
      allowed: true,
      plan: "pro",
    });
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("denies paid-only features to a free user", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const supabase = {
      from: vi.fn(() => ({ select })),
    } as unknown as SupabaseClient;

    await expect(checkEntitlement(supabase, "user-2", "ai_assistant")).resolves.toMatchObject({
      allowed: false,
      plan: "free",
    });
  });
});
