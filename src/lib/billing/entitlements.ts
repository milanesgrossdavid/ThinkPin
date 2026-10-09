import type { SupabaseClient } from "@supabase/supabase-js";
import { planCatalog, type BillingPlan, type FeatureKey } from "./plans";

export type BillingSubscription = {
  plan: BillingPlan;
  status: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

const permittedPaidStatuses = new Set(["active", "trialing", "past_due"]);

function isBillingPlan(value: unknown): value is BillingPlan {
  return value === "free" || value === "pro" || value === "power" || value === "team";
}

export async function getBillingSubscription(
  supabase: SupabaseClient,
  userId: string,
): Promise<BillingSubscription> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "plan, status, current_period_start, current_period_end, stripe_customer_id, stripe_subscription_id",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;

  if (!data || !isBillingPlan(data.plan)) {
    return {
      plan: "free",
      status: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    };
  }

  const active =
    data.plan !== "free" &&
    data.status !== null &&
    permittedPaidStatuses.has(data.status) &&
    (!data.current_period_end ||
      new Date(data.current_period_end).getTime() > Date.now());

  return {
    plan: active ? data.plan : "free",
    status: data.status,
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
  };
}

export async function checkEntitlement(
  supabase: SupabaseClient,
  userId: string,
  feature: FeatureKey,
) {
  const subscription = await getBillingSubscription(supabase, userId);
  return {
    allowed: planCatalog[subscription.plan].features[feature],
    plan: subscription.plan,
    subscription,
  };
}

export function creditPeriod(
  now = new Date(),
  subscription?: BillingSubscription,
) {
  if (
    subscription?.plan !== "free" &&
    subscription?.currentPeriodStart &&
    subscription.currentPeriodEnd &&
    new Date(subscription.currentPeriodStart).getTime() <= now.getTime() &&
    new Date(subscription.currentPeriodEnd).getTime() > now.getTime()
  ) {
    return {
      start: subscription.currentPeriodStart,
      end: subscription.currentPeriodEnd,
    };
  }
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}
