import Stripe from "stripe";
import { NextResponse } from "next/server";
import { authenticatedBillingClient, billingErrorResponse } from "../../../../lib/billing/http";
import { getBillingSubscription } from "../../../../lib/billing/entitlements";
import { stripePriceForPlan, type BillingPlan } from "../../../../lib/billing/plans";
import { getStripeConfig } from "../../../../lib/stripe/env";

function isPaidPlan(value: unknown): value is Exclude<BillingPlan, "free" | "team"> {
  return value === "pro";
}

function isIdempotencyKey(value: string | null): value is string {
  return value !== null && /^[0-9a-f-]{36}$/i.test(value);
}

export async function POST(request: Request) {
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
    const requestId = request.headers.get("idempotency-key");
    if (!isIdempotencyKey(requestId)) {
      return NextResponse.json(
        { error: "A valid Idempotency-Key is required." },
        { status: 400 },
      );
    }
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    if (
      typeof input !== "object" ||
      input === null ||
      !("plan" in input) ||
      !isPaidPlan(input.plan)
    ) {
      return NextResponse.json({ error: "Choose an available paid plan." }, { status: 400 });
    }

    const price = stripePriceForPlan(input.plan);
    if (!price) {
      return NextResponse.json(
        { error: "This plan is not available for purchase yet." },
        { status: 409 },
      );
    }

    const current = await getBillingSubscription(supabase, user.id);
    if (current.plan !== "free" && current.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "Manage your existing subscription through the billing portal." },
        { status: 409 },
      );
    }

    const config = getStripeConfig();
    const stripe = new Stripe(config.secretKey);
    const origin = config.appOrigin;
    let customerId = current.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create(
        {
          ...(user.email ? { email: user.email } : {}),
          metadata: { user_id: user.id },
        },
        { idempotencyKey: `thinkpin-customer-${user.id}` },
      );
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customerId,
        line_items: [{ price, quantity: 1 }],
        success_url: `${origin}/app/billing?checkout=success`,
        cancel_url: `${origin}/app/billing?checkout=cancelled`,
        client_reference_id: user.id,
        metadata: { user_id: user.id, plan: input.plan },
        subscription_data: {
          metadata: { user_id: user.id, plan: input.plan },
        },
      },
      { idempotencyKey: `thinkpin-checkout-${user.id}-${requestId}` },
    );
    if (!session.url) {
      throw new Error("Stripe Checkout did not return a session URL.");
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return billingErrorResponse(error, "Checkout could not be started.");
  }
}
