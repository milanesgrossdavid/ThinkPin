import type { Metadata } from "next";
import { CollectionsBrowser } from "../../../components/collections/collections-browser";
import { requireAuth } from "../../../lib/supabase/require-auth";

export const metadata: Metadata = {
  title: "Collections | ThinkPin",
  description: "Organize the things you want to remember.",
};

export default async function CollectionsPage({
  searchParams,
}: PageProps<"/app/collections">) {
  await requireAuth();
  const { action } = await searchParams;
  return <CollectionsBrowser initialCreate={action === "create"} />;
}
