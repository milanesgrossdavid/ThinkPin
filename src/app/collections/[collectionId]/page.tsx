import type { Metadata } from "next";
import { CollectionDetail } from "../../../components/collections/collection-detail";

export const metadata: Metadata = {
  title: "Collection | ThinkPin",
};

export default async function CollectionPage({
  params,
}: PageProps<"/collections/[collectionId]">) {
  const { collectionId } = await params;
  return <CollectionDetail collectionId={collectionId} />;
}
