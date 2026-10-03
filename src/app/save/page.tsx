import { redirect } from "next/navigation";
import { withSearchParams } from "../../lib/auth/legacy-redirect";

export default async function LegacySavePage({
  searchParams,
}: PageProps<"/save">) {
  redirect(withSearchParams("/app/save", await searchParams));
}
