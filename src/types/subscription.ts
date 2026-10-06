export type SubscriptionPlan = "free" | "pro" | "power" | "team";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export type Subscription = {
  id: string;
  userId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  plan: SubscriptionPlan;
  status?: SubscriptionStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  createdAt: string;
  updatedAt: string;
};
