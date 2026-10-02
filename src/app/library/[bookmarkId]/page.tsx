import type { Metadata } from "next";
import { MockBookmarkDetail } from "../../../components/bookmarks/mock-bookmark-detail";
import { SavedBookmarkDetail } from "../../../components/bookmarks/saved-bookmark-detail";
import { mockBookmarks } from "../../../components/bookmarks/mock-bookmarks";

type BookmarkDetailPageProps = PageProps<"/library/[bookmarkId]">;

export async function generateMetadata({
  params,
}: BookmarkDetailPageProps): Promise<Metadata> {
  const { bookmarkId } = await params;
  const bookmark = mockBookmarks.find((item) => item.id === bookmarkId);

  return {
    title: bookmark ? `${bookmark.title} | ThinkPin` : "Bookmark | ThinkPin",
  };
}

export default async function BookmarkDetailPage({
  params,
}: BookmarkDetailPageProps) {
  const { bookmarkId } = await params;
  const bookmark = mockBookmarks.find((item) => item.id === bookmarkId);

  if (!bookmark) {
    return <SavedBookmarkDetail bookmarkId={bookmarkId} />;
  }

  return <MockBookmarkDetail bookmarkId={bookmark.id} />;
}
