import { redirect } from "next/navigation";
import { withSearchParams } from "../../lib/auth/legacy-redirect";

export default async function LegacyDashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  redirect(withSearchParams("/app", await searchParams));
}
