import type { Metadata } from "next";
import { DashboardHeader } from "../../components/dashboard/dashboard-header";
import {
  StatsOverview,
  type DashboardStats,
} from "../../components/dashboard/stats-overview";
import { RecentlySaved } from "../../components/dashboard/recently-saved";
import { SuggestedForYou } from "../../components/dashboard/suggested-for-you";
import { Rediscover } from "../../components/dashboard/rediscover";
import { QuickSave } from "../../components/dashboard/quick-save";

const dashboardStats: DashboardStats = {
  bookmarks: 1284,
  collections: 42,
  topics: 17,
};

export const metadata: Metadata = {
  title: "Dashboard | ThinkPin",
  description: "Your personal Internet Memory.",
};

export default function DashboardPage() {
  return (
    <main className="min-h-svh bg-background pb-28 md:pb-0">
      <DashboardHeader />
      <QuickSave />
      <StatsOverview stats={dashboardStats} />
      <RecentlySaved />
      <SuggestedForYou />
      <Rediscover />
    </main>
  );
}
