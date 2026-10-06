import type { Metadata } from "next";
import { SavedBookmarkDetail } from "../../../../components/bookmarks/saved-bookmark-detail";
import { requireAuth } from "../../../../lib/supabase/require-auth";

type BookmarkDetailPageProps = PageProps<"/app/bookmarks/[bookmarkId]">;

export async function generateMetadata({
  params,
}: BookmarkDetailPageProps): Promise<Metadata> {
  await params;
  return { title: "Bookmark | ThinkPin" };
}

export default async function BookmarkDetailPage({
  params,
}: BookmarkDetailPageProps) {
  await requireAuth();
  const { bookmarkId } = await params;
  return <SavedBookmarkDetail bookmarkId={bookmarkId} />;
}
