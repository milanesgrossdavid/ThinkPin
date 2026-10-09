import { NextResponse } from "next/server";
import { authenticatedBillingClient, billingErrorResponse } from "../../../lib/billing/http";
import { creditPeriod, getBillingSubscription } from "../../../lib/billing/entitlements";
import { planCatalog, stripePriceForPlan } from "../../../lib/billing/plans";

export async function GET() {
  try {
    const { supabase, user, unavailable } = await authenticatedBillingClient();
    if (unavailable) {
      return NextResponse.json(
        { error: "Authentication is temporarily unavailable." },
        { status: 503 },
      );
    }
    if (!user) {
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    }

    const subscription = await getBillingSubscription(supabase, user.id);
    const { start, end } = creditPeriod(new Date(), subscription);
    const { data: account, error } = await supabase
      .from("credit_accounts")
      .select("credits_reserved, credits_used, period_start, period_end")
      .eq("user_id", user.id)
      .eq("period_start", start)
      .maybeSingle();
    if (error) throw error;
    const allowance = planCatalog[subscription.plan].monthlyCredits;

    return NextResponse.json(
      {
        subscription,
        credits: {
          limit: allowance,
          reserved: account?.credits_reserved ?? 0,
          used: account?.credits_used ?? 0,
          available: Math.max(
            0,
            allowance - (account?.credits_reserved ?? 0) - (account?.credits_used ?? 0),
          ),
          periodStart: account?.period_start ?? start,
          periodEnd: account?.period_end ?? end,
        },
        plans: {
          free: true,
          pro: Boolean(stripePriceForPlan("pro")),
          power: false,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return billingErrorResponse(error, "Billing details could not be loaded.");
  }
}
