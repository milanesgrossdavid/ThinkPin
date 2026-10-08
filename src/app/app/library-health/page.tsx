import type { Metadata } from "next";
import { LibraryHealth } from "../../../components/library-health/library-health";
import { createClient } from "../../../lib/supabase/server";
import { requireAuth } from "../../../lib/supabase/require-auth";
import type {
  LibraryHealthBookmark,
  LibraryHealthStatus,
  LibraryHealthSummary,
} from "../../../types/library-health";

export const metadata: Metadata = {
  title: "Library Health | ThinkPin",
  description: "Check which saved links are healthy, redirected, or broken.",
};

const PAGE_SIZE = 50;
const statuses = new Set<LibraryHealthStatus>([
  "all",
  "healthy",
  "redirect",
  "broken",
  "timeout",
  "blocked",
  "unknown",
]);

type SummaryRow = {
  total: number;
  healthy: number;
  redirects: number;
  broken: number;
  timeouts: number;
  blocked: number;
  unknown: number;
};

type BookmarkRow = {
  bookmark_id: string;
  title: string;
  url: string;
  domain: string;
  created_at: string;
  status: LibraryHealthBookmark["status"];
  http_status: number | null;
  redirect_url: string | null;
  checked_at: string | null;
  response_time: number | null;
  error: string | null;
  total_matching: number;
};

export default async function LibraryHealthPage({
  searchParams,
}: PageProps<"/app/library-health">) {
  await requireAuth();
  const params = await searchParams;
  const requestedStatus =
    typeof params.status === "string" &&
    statuses.has(params.status as LibraryHealthStatus)
      ? (params.status as LibraryHealthStatus)
      : "all";
  const requestedPage = Array.isArray(params.page)
    ? params.page[0]
    : params.page;
  const parsedPage = Number.parseInt(requestedPage ?? "0", 10);
  const requestedPageNumber =
      Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 0;
  const supabase = await createClient();

  const { data: summaryData, error: summaryError } = await supabase.rpc(
      "get_user_library_health_summary",
  );
  if (summaryError) {
      const missingLinkHealthMigration =
        summaryError.code === "PGRST202" || summaryError.code === "42883";
      if (missingLinkHealthMigration) {
        return (
          <main className="min-h-svh bg-background px-5 py-10 sm:px-8 lg:px-12">
            <div className="mx-auto max-w-container-xl rounded-2xl border border-warning/40 bg-surface-elevated p-6">
              <h1 className="text-xl font-semibold text-text">Library Health</h1>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                Apply{" "}
                <code className="rounded bg-background px-1.5 py-0.5">
                  supabase/migrations/20261008180000_add_link_health_v1.sql
                </code>{" "}
                to enable Library Health. The existing link check and bookmark
                migrations must be applied first.
              </p>
            </div>
          </main>
        );
      }
      console.error("Library Health could not be loaded.", {
        summaryError,
      });
      throw new Error("Library Health could not be loaded.");
  }

  const rawSummary = ((summaryData ?? []) as SummaryRow[])[0];
  const summary: LibraryHealthSummary = rawSummary
    ? {
        total: Number(rawSummary.total),
        healthy: Number(rawSummary.healthy),
        redirects: Number(rawSummary.redirects),
        broken: Number(rawSummary.broken),
        timeouts: Number(rawSummary.timeouts),
        blocked: Number(rawSummary.blocked),
        unknown: Number(rawSummary.unknown),
      }
    : {
        total: 0,
        healthy: 0,
        redirects: 0,
        broken: 0,
        timeouts: 0,
        blocked: 0,
        unknown: 0,
      };
  const totalMatching =
    requestedStatus === "all"
      ? summary.total
      : requestedStatus === "redirect"
        ? summary.redirects
        : requestedStatus === "timeout"
          ? summary.timeouts
          : summary[requestedStatus];
  const pageCount = Math.ceil(totalMatching / PAGE_SIZE);
  const page = Math.min(
    requestedPageNumber,
    Math.max(0, pageCount - 1),
  );
  const { data: bookmarkData, error: bookmarksError } = await supabase.rpc(
    "get_user_library_health_bookmarks",
    {
      p_status: requestedStatus === "all" ? null : requestedStatus,
      p_limit: PAGE_SIZE,
      p_offset: page * PAGE_SIZE,
    },
  );
  if (bookmarksError) {
    if (
      bookmarksError.code === "PGRST202" ||
      bookmarksError.code === "42883"
    ) {
      return (
        <main className="min-h-svh bg-background px-5 py-10 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-container-xl rounded-2xl border border-warning/40 bg-surface-elevated p-6">
            <h1 className="text-xl font-semibold text-text">Library Health</h1>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              Apply{" "}
              <code className="rounded bg-background px-1.5 py-0.5">
                supabase/migrations/20261008180000_add_link_health_v1.sql
              </code>{" "}
              to enable Library Health. The existing link check and bookmark
              migrations must be applied first.
            </p>
          </div>
        </main>
      );
    }
    console.error("Library Health bookmarks could not be loaded.", bookmarksError);
    throw new Error("Library Health bookmarks could not be loaded.");
  }
  const bookmarks: LibraryHealthBookmark[] = (
    (bookmarkData ?? []) as BookmarkRow[]
  ).map((row) => ({
    bookmarkId: row.bookmark_id,
    title: row.title,
    url: row.url,
    domain: row.domain,
    createdAt: row.created_at,
    status: row.status,
    httpStatus: row.http_status,
    redirectUrl: row.redirect_url,
    checkedAt: row.checked_at,
    responseTime: row.response_time,
    error: row.error,
    totalMatching: Number(row.total_matching),
  }));

  return (
    <LibraryHealth
      summary={summary}
      bookmarks={bookmarks}
      status={requestedStatus}
      page={page}
      pageSize={PAGE_SIZE}
    />
  );
}
