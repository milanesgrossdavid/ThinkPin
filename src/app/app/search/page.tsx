import type { Metadata } from "next";
import { SearchPage } from "../../../components/search/search-page";
import type { SearchMode } from "../../../lib/search";
import { requireAuth } from "../../../lib/supabase/require-auth";

export const metadata: Metadata = {
  title: "Search your memory | ThinkPin",
  description: "Find anything you've saved to your Internet Memory.",
};

const searchModes: SearchMode[] = ["keyword", "full-text", "semantic", "ai"];

export default async function SearchRoute({
  searchParams,
}: PageProps<"/app/search">) {
  await requireAuth();
  const { q, mode } = await searchParams;
  const initialMode =
    typeof mode === "string" && searchModes.some((value) => value === mode)
      ? (mode as SearchMode)
      : "keyword";
  const initialQuery = typeof q === "string" ? q : "";

  return (
    <SearchPage
      key={`${initialQuery}:${initialMode}`}
      initialQuery={initialQuery}
      initialMode={initialMode}
    />
  );
}
