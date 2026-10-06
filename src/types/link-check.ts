export type LinkCheckStatus =
  | "healthy"
  | "redirect"
  | "broken"
  | "timeout"
  | "blocked"
  | "unknown";

export type LinkCheck = {
  id: string;
  bookmarkId: string;
  status: LinkCheckStatus;
  httpStatus?: number;
  redirectUrl?: string;
  checkedAt: string;
  responseTime?: number;
  error?: string;
};
