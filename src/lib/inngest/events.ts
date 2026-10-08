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

export type LinkCheckRequestedEvent = {
  name: "link-health.check-requested";
  data: {
    bookmarkId: string;
    userId: string;
  };
};

export const linkCheckRequested = eventType("link-health.check-requested", {
  schema: staticSchema<LinkCheckRequestedEvent["data"]>(),
});
