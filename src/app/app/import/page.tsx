import type { Metadata } from "next";
import { BrowserBookmarkImport } from "../../../components/import/browser-bookmark-import";
import { requireAuth } from "../../../lib/supabase/require-auth";

export const metadata: Metadata = {
  title: "Import bookmarks | ThinkPin",
  description: "Bring your browser bookmarks into your ThinkPin library.",
};

export default async function ImportPage({
  searchParams,
}: PageProps<"/app/import">) {
  await requireAuth();
  const { job, demo } = await searchParams;
  return (
    <main className="min-h-svh bg-background px-4 py-8 sm:px-8 sm:py-12">
      <BrowserBookmarkImport
        initialJobId={typeof job === "string" ? job : null}
        demoMode={demo === "1"}
      />
    </main>
  );
}
