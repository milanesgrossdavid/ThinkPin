export type CollectionVisibility = "private" | "shared" | "public";

export type Collection = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  visibility: CollectionVisibility;
  coverImageUrl?: string;
  createdAt: string;
  updatedAt?: string;
};
