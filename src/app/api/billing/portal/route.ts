import Stripe from "stripe";
import { NextResponse } from "next/server";
import { authenticatedBillingClient, billingErrorResponse } from "../../../../lib/billing/http";
import { getBillingSubscription } from "../../../../lib/billing/entitlements";
import { getAppOrigin, getStripeConfig } from "../../../../lib/stripe/env";

export async function POST() {
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
    const current = await getBillingSubscription(supabase, user.id);
    if (!current.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer is associated with this account." },
        { status: 409 },
      );
    }
    const config = getStripeConfig();
    const origin = getAppOrigin();
    const stripe = new Stripe(config.secretKey);
    const session = await stripe.billingPortal.sessions.create({
      customer: current.stripeCustomerId,
      return_url: `${origin}/app/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return billingErrorResponse(error, "The billing portal could not be opened.");
  }
}
