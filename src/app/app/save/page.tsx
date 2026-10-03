import type { Metadata } from "next";
import { SmartSave } from "../../../components/bookmarks/smart-save";
import { requireAuth } from "../../../lib/supabase/require-auth";

export const metadata: Metadata = {
  title: "Save something | ThinkPin",
  description: "Save a link to your personal Internet Memory.",
};

export default async function SavePage({
  searchParams,
}: PageProps<"/app/save">) {
  await requireAuth();
  const { url } = await searchParams;

  return <SmartSave initialUrl={typeof url === "string" ? url : undefined} />;
}
