import { redirect } from "next/navigation";

export default async function LegacyCollectionPage({
  params,
}: PageProps<"/collections/[collectionId]">) {
  const { collectionId } = await params;
  redirect(`/app/collections/${encodeURIComponent(collectionId)}`);
}
