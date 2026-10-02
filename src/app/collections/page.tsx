import type { Metadata } from "next";
import { CollectionsBrowser } from "../../components/collections/collections-browser";

export const metadata: Metadata = {
  title: "Collections | ThinkPin",
  description: "Organize the things you want to remember.",
};

export default async function CollectionsPage({
  searchParams,
}: PageProps<"/collections">) {
  const { action } = await searchParams;
  return <CollectionsBrowser initialCreate={action === "create"} />;
}
