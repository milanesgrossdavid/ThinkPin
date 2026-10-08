import type { Metadata } from "next";
import { DashboardHeader } from "../../components/dashboard/dashboard-header";
import { RecentlySaved } from "../../components/dashboard/recently-saved";
import { QuickSave } from "../../components/dashboard/quick-save";
import { MagicCollections } from "../../components/dashboard/magic-collections";
import { SmartResurfacingSection } from "../../components/dashboard/smart-resurfacing-section";
import { requireAuth } from "../../lib/supabase/require-auth";

export const metadata: Metadata = {
  title: "Dashboard | ThinkPin",
  description: "Your personal Internet Memory.",
};

export default async function DashboardPage() {
  await requireAuth();

  return (
    <main className="min-h-svh bg-background pb-28 md:pb-0">
      <DashboardHeader />
      <QuickSave />
      <MagicCollections />
      <SmartResurfacingSection />
      <RecentlySaved />
    </main>
  );
}
