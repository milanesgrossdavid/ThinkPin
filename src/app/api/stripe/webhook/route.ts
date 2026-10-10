import { createClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";
import Stripe from "stripe";
import { getStripeWebhookConfig } from "../../../../lib/stripe/env";

export const runtime = "nodejs";

type PaidPlan = "pro" | "power" | "team";
type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

const allowedStatuses = new Set<SubscriptionStatus>([
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "paused",
]);

function planForPrice(priceId: string, prices: {
  pro: string;
  power?: string;
  team?: string;
}): PaidPlan {
  if (priceId === prices.pro) return "pro";
  if (prices.power && priceId === prices.power) return "power";
  if (prices.team && priceId === prices.team) return "team";
  throw new Error(`Unmapped Stripe price ID: ${priceId}`);
}

function stripeId(value: string | { id: string }) {
  return typeof value === "string" ? value : value.id;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  try {
    const config = getStripeWebhookConfig();
    const stripe = new Stripe(config.secretKey);
    const rawBody = await request.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        config.webhookSecret,
      );
    } catch (error) {
      console.error("Stripe webhook signature verification failed.", error);
      return Response.json({ error: "Invalid Stripe signature." }, { status: 400 });
    }

    if (
      event.type !== "customer.subscription.created" &&
      event.type !== "customer.subscription.updated" &&
      event.type !== "customer.subscription.deleted"
    ) {
      return Response.json({ received: true });
    }

    const eventSubscription = event.data.object as Stripe.Subscription;
    const subscription = await stripe.subscriptions.retrieve(
      eventSubscription.id,
    );
    const admin = createClient(config.supabaseUrl, config.supabaseSecretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const customerId = stripeId(subscription.customer);
    let userId = subscription.metadata.user_id;

    if (!userId) {
      const { data: existing, error: lookupError } = await admin
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (lookupError) {
        throw lookupError;
      }
      userId = existing?.user_id ?? "";
    }

    if (!userId) {
      throw new Error(
        `No app user mapped to Stripe customer ${customerId}; set subscription metadata user_id during server-created Checkout.`,
      );
    }

    const planPriceIds = new Set(
      [config.prices.pro, config.prices.power, config.prices.team].filter(
        (priceId): priceId is string => Boolean(priceId),
      ),
    );
    const planItem = subscription.items.data.find((item) =>
      planPriceIds.has(item.price.id),
    );
    if (!planItem) {
      throw new Error(`Stripe subscription ${subscription.id} has no price.`);
    }
    const plan = planForPrice(planItem.price.id, config.prices);
    const status = subscription.status as SubscriptionStatus;

    if (!allowedStatuses.has(status)) {
      throw new Error(`Unsupported Stripe subscription status: ${status}`);
    }

    const { error: upsertError } = await admin.rpc(
      "sync_subscription_from_stripe_event",
      {
        p_stripe_event_id: event.id,
        p_event_type: event.type,
        p_user_id: userId,
        p_stripe_customer_id: customerId,
        p_stripe_subscription_id: subscription.id,
        p_plan: status === "canceled" ? "free" : plan,
        p_status: status,
        p_current_period_start: planItem.current_period_start
          ? new Date(planItem.current_period_start * 1000).toISOString()
          : null,
        p_current_period_end: planItem.current_period_end
          ? new Date(planItem.current_period_end * 1000).toISOString()
          : null,
        p_stripe_event_created_at: event.created,
      },
    );

    if (upsertError) {
      throw upsertError;
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed.", error);
    Sentry.captureMessage("Stripe webhook processing failed.", {
      level: "error",
      tags: { operation: "stripe_webhook" },
    });
    return Response.json(
      { error: "Webhook processing failed; Stripe may retry this event." },
      { status: 500 },
    );
  }
}
