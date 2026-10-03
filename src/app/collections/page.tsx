import { redirect } from "next/navigation";
import { withSearchParams } from "../../lib/auth/legacy-redirect";

export default async function LegacyCollectionsPage({
  searchParams,
}: PageProps<"/collections">) {
  redirect(withSearchParams("/app/collections", await searchParams));
}
