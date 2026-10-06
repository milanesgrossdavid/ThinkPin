import { eventType, staticSchema } from "inngest";

export type BookmarkCreatedEvent = {
  name: "bookmark.created";
  data: {
    bookmarkId: string;
    userId: string;
  };
};

export const bookmarkCreated = eventType("bookmark.created", {
  schema: staticSchema<BookmarkCreatedEvent["data"]>(),
});
