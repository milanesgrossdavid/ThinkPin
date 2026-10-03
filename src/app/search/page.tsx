import { redirect } from "next/navigation";
import { withSearchParams } from "../../lib/auth/legacy-redirect";

export default async function LegacySearchPage({
  searchParams,
}: PageProps<"/search">) {
  redirect(withSearchParams("/app/search", await searchParams));
}
