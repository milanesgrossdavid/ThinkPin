"use client";

import { useEffect, useState } from "react";
import { Globe2, LoaderCircle } from "lucide-react";
import { BookmarkList } from "./BookmarkList";
import type { Bookmark } from "./types";
import type { RelatedBookmark } from "../../lib/search/types";

type RelatedResponse = {
  status: "ready" | "not-indexed" | "indexing";
  results: RelatedBookmark[];
  message?: string;
};

function isRelatedResponse(value: unknown): value is RelatedResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    (value.status === "ready" ||
      value.status === "not-indexed" ||
      value.status === "indexing") &&
    "results" in value &&
    Array.isArray(value.results) &&
    value.results.every(
      (result) =>
        typeof result === "object" &&
        result !== null &&
        "id" in result &&
        typeof result.id === "string" &&
        "title" in result &&
        typeof result.title === "string" &&
        "description" in result &&
        (typeof result.description === "string" || result.description === null) &&
        "url" in result &&
        typeof result.url === "string" &&
        "domain" in result &&
        typeof result.domain === "string" &&
        "imageUrl" in result &&
        (typeof result.imageUrl === "string" || result.imageUrl === null) &&
        "contentType" in result &&
        typeof result.contentType === "string" &&
        "createdAt" in result &&
        typeof result.createdAt === "string" &&
        "tags" in result &&
        Array.isArray(result.tags) &&
        result.tags.every((tag: unknown) => typeof tag === "string") &&
        "similarity" in result &&
        typeof result.similarity === "number",
    ) &&
    (!("message" in value) ||
      value.message === undefined ||
      typeof value.message === "string")
  );
}

function toBookmark(result: RelatedBookmark): Bookmark {
  const contentTypes = new Set([
    "article",
    "video",
    "repository",
    "product",
    "tool",
    "social",
    "document",
    "image",
    "other",
  ]);
  return {
    id: result.id,
    title: result.title,
    description: result.description ?? undefined,
    topic: "Related",
    subtopic: result.contentType,
    tags: result.tags,
    domain: result.domain,
    url: result.url,
    savedAt: result.createdAt,
    icon: Globe2,
    artwork: "from-primary/15 via-sky-500/10 to-transparent",
    thumbnailUrl: result.imageUrl ?? undefined,
    contentType: contentTypes.has(result.contentType)
      ? (result.contentType as NonNullable<Bookmark["contentType"]>)
      : "other",
  };
}

export function RelatedBookmarks({ bookmarkId }: { bookmarkId: string }) {
  const [retryVersion, setRetryVersion] = useState(0);
  const [state, setState] = useState<
    | { bookmarkId: string; status: "loading" }
    | { bookmarkId: string; status: "indexing" }
    | { bookmarkId: string; status: "indexing-timeout" }
    | {
        bookmarkId: string;
        status: "not-indexed";
        message?: string;
      }
    | {
        bookmarkId: string;
        status: "ready";
        results: RelatedBookmark[];
      }
    | { bookmarkId: string; status: "error"; message: string }
  >({ bookmarkId, status: "loading" });

  const visibleState =
    state.bookmarkId === bookmarkId
      ? state
      : { bookmarkId, status: "loading" as const };

  useEffect(() => {
    const controller = new AbortController();
    let pollTimeout: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const load = async (retryFailedIndexing = false) => {
      try {
        const response = await fetch(
          `/api/bookmarks/${encodeURIComponent(bookmarkId)}/related${
            retryFailedIndexing ? "?retryIndex=true" : ""
          }`,
          { signal: controller.signal },
        );
        const payload: unknown = await response.json();
        if (!response.ok) {
          const message =
            typeof payload === "object" &&
            payload !== null &&
            "error" in payload &&
            typeof payload.error === "string"
              ? payload.error
              : "Related bookmarks could not be loaded.";
          throw new Error(message);
        }
        if (!isRelatedResponse(payload)) {
          throw new Error("Related bookmarks returned an invalid response.");
        }
        if (payload.status === "indexing") {
          attempts += 1;
          if (attempts < 20) {
            setState({ bookmarkId, status: "indexing" });
            pollTimeout = setTimeout(() => void load(), 3_000);
          } else {
            setState({ bookmarkId, status: "indexing-timeout" });
          }
        } else if (payload.status === "not-indexed") {
          setState({
            bookmarkId,
            status: "not-indexed",
            message: payload.message,
          });
        } else {
          setState({ bookmarkId, status: "ready", results: payload.results });
        }
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setState({
          bookmarkId,
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Related bookmarks could not be loaded.",
        });
      }
    };
    void load(true);

    return () => {
      controller.abort();
      if (pollTimeout) clearTimeout(pollTimeout);
    };
  }, [bookmarkId, retryVersion]);

  return (
    <section
      aria-labelledby="related-bookmarks-title"
      className="mt-8 pb-2"
    >
      <h2
        id="related-bookmarks-title"
        className="text-lg font-semibold tracking-[-0.03em] text-text"
      >
        Related from your library
      </h2>
      {visibleState.status === "loading" ? (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 text-sm text-text-muted"
        >
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin text-primary"
          />
          Finding related bookmarks…
        </p>
      ) : visibleState.status === "error" ? (
        <p role="alert" className="mt-4 text-sm leading-6 text-error">
          {visibleState.message}
        </p>
      ) : visibleState.status === "indexing" ? (
        <p role="status" className="mt-4 text-sm leading-6 text-text-muted">
          Indexing this bookmark to find related links…
        </p>
      ) : visibleState.status === "indexing-timeout" ? (
        <div className="mt-4">
          <p role="status" className="text-sm leading-6 text-text-muted">
            Indexing is taking longer than expected.
          </p>
          <button
            type="button"
            onClick={() => setRetryVersion((version) => version + 1)}
            className="mt-2 text-sm font-medium text-primary hover:underline"
          >
            Check again
          </button>
        </div>
      ) : visibleState.status === "not-indexed" ? (
        <div className="mt-4">
          <p className="text-sm leading-6 text-text-muted">
            {visibleState.message ??
              "Related links will appear once this bookmark has been indexed."}
          </p>
          <button
            type="button"
            onClick={() => setRetryVersion((version) => version + 1)}
            className="mt-2 text-sm font-medium text-primary hover:underline"
          >
            Retry indexing
          </button>
        </div>
      ) : visibleState.results.length ? (
        <div className="mt-4">
          <BookmarkList
            bookmarks={visibleState.results.map(toBookmark)}
            hideSavedDate
          />
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-text-muted">
          No sufficiently similar bookmarks found yet.
        </p>
      )}
    </section>
  );
}
