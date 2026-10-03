export type CollectionVisibility = "private" | "shared" | "public";

export type Collection = {
  id: string;
  name: string;
  description?: string;
  visibility: CollectionVisibility;
  bookmarkCount: number;
  coverImageUrl?: string;
  createdAt: string;
  updatedAt?: string;
};
