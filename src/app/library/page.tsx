import { redirect } from "next/navigation";
import { withSearchParams } from "../../lib/auth/legacy-redirect";

export default async function LegacyLibraryPage({
  searchParams,
}: PageProps<"/library">) {
  redirect(withSearchParams("/app/bookmarks", await searchParams));
}
