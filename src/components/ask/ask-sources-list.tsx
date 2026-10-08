import { Globe2 } from "lucide-react";
import { BookmarkList } from "../bookmarks/BookmarkList";
import type { Bookmark } from "../bookmarks/types";
import type { AskSource } from "../../lib/ask/types";

export function AskSourcesList({ sources }: { sources: AskSource[] }) {
  const bookmarks: Bookmark[] = sources.map((source) => ({
    id: source.bookmarkId,
    title: source.title,
    topic: "Sources",
    subtopic: "AI Search",
    domain: source.domain,
    url: source.url,
    savedAt: "",
    icon: Globe2,
    artwork: "from-primary/15 via-sky-500/10 to-transparent",
    contentType: "other",
    tags: [],
  }));

  return (
    <section aria-labelledby="ask-sources-heading" className="mt-8">
      <h2
        id="ask-sources-heading"
        className="mb-3 text-base font-semibold text-text"
      >
        Sources
        <span className="ml-2 text-sm font-normal text-text-muted">
          ({sources.length})
        </span>
      </h2>
      {bookmarks.length > 0 ? (
        <BookmarkList
          bookmarks={bookmarks}
          hideDescription
          hideSavedDate
        />
      ) : (
        <p className="text-sm text-text-muted">
          No saved sources matched this question.
        </p>
      )}
    </section>
  );
}
