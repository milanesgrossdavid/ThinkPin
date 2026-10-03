import type { Metadata } from "next";
import { LibraryHeader } from "../../../components/library/library-header";
import { LibraryBrowser } from "../../../components/library/library-browser";
import {
  isLibraryFilter,
  type LibraryFilter,
} from "../../../components/library/library-types";
import { requireAuth } from "../../../lib/supabase/require-auth";

const libraryItemCount = 1284;

export const metadata: Metadata = {
  title: "Your Library | ThinkPin",
  description: "Everything you've saved in your ThinkPin library.",
};

export default async function BookmarksPage({
  searchParams,
}: PageProps<"/app/bookmarks">) {
  await requireAuth();
  const {
    filter: requestedFilter,
    tag: requestedTag,
    collection: requestedCollection,
  } = await searchParams;
  const initialFilter: LibraryFilter =
    typeof requestedFilter === "string" && isLibraryFilter(requestedFilter)
      ? requestedFilter
      : "all";

  return (
    <main className="min-h-svh bg-background">
      <LibraryHeader itemCount={libraryItemCount} />
      <LibraryBrowser
        initialFilter={initialFilter}
        initialTag={typeof requestedTag === "string" ? requestedTag : ""}
        initialCollection={
          typeof requestedCollection === "string" ? requestedCollection : ""
        }
      />
    </main>
  );
}
