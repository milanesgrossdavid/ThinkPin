import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  retrieveSubscription: vi.fn(),
  createClient: vi.fn(),
  rpc: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class Stripe {
    webhooks = { constructEvent: mocks.constructEvent };
    subscriptions = { retrieve: mocks.retrieveSubscription };
  },
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));
vi.mock("@sentry/nextjs", () => ({
  captureMessage: mocks.captureMessage,
}));
vi.mock("../../src/lib/stripe/env", () => ({
  getStripeWebhookConfig: () => ({
    secretKey: "stripe-test-secret",
    webhookSecret: "webhook-test-secret",
    supabaseUrl: "https://supabase.example.test",
    supabaseSecretKey: "supabase-test-secret",
    prices: { pro: "price_pro", power: "price_power", team: undefined },
  }),
}));

import { POST } from "../../src/app/api/stripe/webhook/route";

describe("Stripe webhook integration", () => {
  beforeEach(() => {
    mocks.constructEvent.mockReset();
    mocks.retrieveSubscription.mockReset();
    mocks.createClient.mockReset();
    mocks.rpc.mockReset();
    mocks.captureMessage.mockReset();
  });

  it("rejects an invalid Stripe signature before updating billing", async () => {
    mocks.constructEvent.mockImplementation(() => {
      throw new Error("signature mismatch");
    });

    const response = await POST(
      new Request("https://thinkpin.example/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "invalid" },
        body: "{}",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("sends a signed subscription event to the billing synchronization RPC", async () => {
    mocks.constructEvent.mockReturnValue({
      id: "evt_test",
      type: "customer.subscription.updated",
      created: 1_791_600_000,
      data: { object: { id: "sub_test" } },
    });
    mocks.retrieveSubscription.mockResolvedValue({
      id: "sub_test",
      customer: "cus_test",
      metadata: { user_id: "user-1" },
      status: "active",
      items: {
        data: [{
          price: { id: "price_pro" },
          current_period_start: 1_791_590_000,
          current_period_end: 1_794_182_000,
        }],
      },
    });
    mocks.rpc.mockResolvedValue({ error: null });
    mocks.createClient.mockReturnValue({ rpc: mocks.rpc });

    const response = await POST(
      new Request("https://thinkpin.example/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "signed" },
        body: "{}",
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "sync_subscription_from_stripe_event",
      expect.objectContaining({
        p_stripe_event_id: "evt_test",
        p_user_id: "user-1",
        p_plan: "pro",
        p_status: "active",
      }),
    );
  });
});
