import type { Bookmark } from "./bookmark";
import type { Collection } from "./collection";

export type DashboardStats = {
  bookmarkCount: number;
  collectionCount: number;
  topicCount: number;
};

export type DashboardData = {
  stats: DashboardStats;
  recentlySaved: Bookmark[];
  suggestedCollections: Collection[];
  rediscoverBookmarks: Bookmark[];
};
