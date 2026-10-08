import { inngest } from "../client";
import { linkCheckRequested } from "../events";
import { createAdminClient } from "../../supabase/admin";
import { checkAndSaveBookmarkLink } from "../../link-health/checker";

type ScheduledBookmarkRow = {
  bookmark_id: string;
  user_id: string;
  url: string;
};

async function loadScheduledBatch() {
  const { data, error } = await createAdminClient().rpc(
    "claim_link_health_batch",
    { p_limit: 100 },
  );
  if (error) throw error;
  return (data ?? []) as ScheduledBookmarkRow[];
}

export const linkHealthWeeklySweep = inngest.createFunction(
  {
    id: "link-health-weekly-sweep",
    name: "Weekly link health sweep",
    triggers: [{ cron: "0 3 * * 1" }],
    retries: 2,
  },
  async ({ step }) => {
    const bookmarks = await step.run("load-oldest-link-check-batch", () =>
      loadScheduledBatch(),
    );
    await step.run("enqueue-link-checks", async () => {
      if (bookmarks.length === 0) return;
      await inngest.send(
        bookmarks.map((bookmark) =>
          linkCheckRequested.create({
            bookmarkId: bookmark.bookmark_id,
            userId: bookmark.user_id,
          }),
        ),
      );
    });
    return { queued: bookmarks.length };
  },
);

export const linkHealthOnDemandCheck = inngest.createFunction(
  {
    id: "link-health-on-demand-check",
    name: "Check bookmark link health",
    triggers: [{ event: linkCheckRequested }],
    concurrency: { limit: 10 },
    retries: 2,
  },
  async ({ event, step }) => {
    const bookmark = await step.run("load-bookmark-url", async () => {
      const { data, error } = await createAdminClient()
        .from("bookmarks")
        .select("id,url")
        .eq("id", event.data.bookmarkId)
        .eq("user_id", event.data.userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Bookmark no longer exists.");
      return data;
    });

    const result = await step.run("check-and-save-link-health", () =>
      checkAndSaveBookmarkLink(createAdminClient(), bookmark),
    );
    return { bookmarkId: bookmark.id, status: result.status };
  },
);
