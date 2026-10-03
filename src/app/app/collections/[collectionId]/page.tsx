import type { Metadata } from "next";
import { CollectionDetail } from "../../../../components/collections/collection-detail";
import { requireAuth } from "../../../../lib/supabase/require-auth";

export const metadata: Metadata = {
  title: "Collection | ThinkPin",
};

export default async function CollectionPage({
  params,
}: PageProps<"/app/collections/[collectionId]">) {
  await requireAuth();
  const { collectionId } = await params;
  return <CollectionDetail collectionId={collectionId} />;
}
