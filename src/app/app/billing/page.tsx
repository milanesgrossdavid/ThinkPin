import type { Metadata } from "next";
import { BillingPage } from "../../../components/billing/billing-page";
import { requireAuth } from "../../../lib/supabase/require-auth";

export const metadata: Metadata = {
  title: "Billing | ThinkPin",
  description: "Manage your ThinkPin plan and AI credits.",
};

export default async function AccountBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  await requireAuth();
  const { checkout } = await searchParams;
  return <BillingPage checkoutState={checkout} />;
}
