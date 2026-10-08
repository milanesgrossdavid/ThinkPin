export type ResurfacingBookmark = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  domain: string;
  contentType: string;
  intent: string | null;
  contentStatus: string;
  createdAt: string;
  lastOpenedAt: string | null;
  tags: string[];
  collection: string | null;
};

export type ResurfacingCandidate = ResurfacingBookmark & {
  relevanceScore: number;
  reason: string;
  ageLabel: string;
};
