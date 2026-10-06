import { inngest } from "../client";
import { bookmarkCreated } from "../events";
import { createAdminClient } from "../../supabase/admin";
import { extractMetadata } from "../../ingestion/metadata";
import {
  getBookmarkForIngestion,
  saveBookmarkMetadata,
  setBookmarkContentStatus,
} from "../../bookmarks/service";

export const bookmarkIngestion = inngest.createFunction(
  {
    id: "bookmark-ingestion",
    name: "Bookmark ingestion",
    triggers: [{ event: bookmarkCreated }],
    retries: 3,
    onFailure: async ({ event, step }) => {
      const { bookmarkId, userId } = event.data.event.data;
      await step.run("mark-bookmark-failed", async () => {
        await setBookmarkContentStatus(
          createAdminClient(),
          bookmarkId,
          userId,
          "failed",
        );
      });
    },
  },
  async ({ event, step }) => {
    const bookmark = await step.run("load-bookmark", () =>
      getBookmarkForIngestion(
        createAdminClient(),
        event.data.bookmarkId,
        event.data.userId,
      ),
    );

    await step.run("mark-bookmark-processing", async () => {
      await setBookmarkContentStatus(
        createAdminClient(),
        bookmark.id,
        bookmark.userId,
        "processing",
      );
    });

    const metadata = await step.run("extract-page-metadata", () =>
      extractMetadata(bookmark.url),
    );

    await step.run("save-page-metadata", () =>
      saveBookmarkMetadata(createAdminClient(), bookmark, metadata),
    );

    return { bookmarkId: bookmark.id, contentStatus: "ready" };
  },
);
