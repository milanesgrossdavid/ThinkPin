import type { LinkCheckStatus } from "./link-check";

export type LibraryHealthStatus = LinkCheckStatus | "all";

export type LibraryHealthSummary = {
  total: number;
  healthy: number;
  redirects: number;
  broken: number;
  timeouts: number;
  blocked: number;
  unknown: number;
};

export type LibraryHealthBookmark = {
  bookmarkId: string;
  title: string;
  url: string;
  domain: string;
  createdAt: string;
  status: LinkCheckStatus;
  httpStatus: number | null;
  redirectUrl: string | null;
  checkedAt: string | null;
  responseTime: number | null;
  error: string | null;
  totalMatching: number;
};
