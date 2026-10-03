import { redirect } from "next/navigation";

export default async function LegacyBookmarkPage({
  params,
}: PageProps<"/library/[bookmarkId]">) {
  const { bookmarkId } = await params;
  redirect(`/app/bookmarks/${encodeURIComponent(bookmarkId)}`);
}
