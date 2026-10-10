"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppToast } from "../feedback/AppToaster";
import {
  bookmarkSavedEvent,
  cacheServerBookmark,
  notifyBookmarkSaved,
  replaceBookmarksFromDatabase,
  type BookmarkContentType,
  type BookmarkIntent,
  type SavedBookmark,
} from "../../lib/bookmarks";
import {
  clearPendingBookmark,
  readPendingBookmark,
} from "../../lib/bookmarks/pending-bookmark";

type DatabaseBookmark = {
  id: string;
  url: string;
  canonical_url: string | null;
  title: string;
  description: string | null;
  domain: string;
  favicon_url: string | null;
  image_url: string | null;
  content_type: SavedBookmark["contentType"] | null;
  intent: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  is_read: boolean;
  content_status: SavedBookmark["contentStatus"];
  created_at: string;
  tags: string[];
  collection: string | null;
  notes: string | null;
  saved_reason: string | null;
};

const validIntents: BookmarkIntent[] = [
  "Research",
  "Learn",
  "Buy",
  "Reference",
  "Project",
  "Inspiration",
];

function toBookmarkIntent(intent: string): BookmarkIntent | undefined {
  const normalized = intent.toLocaleLowerCase();
  return validIntents.find((value) => value.toLocaleLowerCase() === normalized);
}

const validContentTypes: BookmarkContentType[] = [
  "article",
  "video",
  "repository",
  "product",
  "tool",
  "social",
  "document",
  "image",
  "other",
];

function toBookmarkContentType(value: unknown): BookmarkContentType | undefined {
  return typeof value === "string" &&
    validContentTypes.includes(value as BookmarkContentType)
    ? value as BookmarkContentType
    : undefined;
}

export function BookmarkSync() {
  const pathname = usePathname();
  const toast = useAppToast();

  useEffect(() => {
    if (!pathname.startsWith("/app")) {
      return;
    }

    const controller = new AbortController();
    const pollingBookmarks = new Set<string>();

    function startBookmarkPolling(bookmarkId: string) {
      if (pollingBookmarks.has(bookmarkId)) return;
      pollingBookmarks.add(bookmarkId);

      void (async () => {
        for (let attempt = 0; attempt < 90; attempt += 1) {
          if (attempt > 0) {
            await new Promise((resolve) => window.setTimeout(resolve, 1_200));
          }
          if (controller.signal.aborted) return;

          let response: Response;
          try {
            response = await fetch(`/api/bookmarks/${bookmarkId}`, {
              cache: "no-store",
              signal: controller.signal,
            });
          } catch (error) {
            if (controller.signal.aborted) return;
            if (attempt === 0) {
              console.error("Could not refresh bookmark processing status.", error);
            }
            continue;
          }

          if (!response.ok) {
            if (response.status >= 500 || response.status === 429) {
              if (attempt === 0) {
                console.error(
                  "Could not refresh bookmark processing status.",
                  response.status,
                );
              }
              continue;
            }
            console.error(
              "Bookmark processing status request failed.",
              response.status,
            );
            return;
          }

          const payload: unknown = await response.json();
          if (
            typeof payload !== "object" ||
            payload === null ||
            !("bookmark" in payload) ||
            typeof payload.bookmark !== "object" ||
            payload.bookmark === null
          ) {
            console.error("Bookmark processing response was invalid.");
            return;
          }

          const record = payload.bookmark as Record<string, unknown>;
          if (
            typeof record.id !== "string" ||
            typeof record.url !== "string" ||
            typeof record.domain !== "string" ||
            typeof record.created_at !== "string" ||
            !["pending", "processing", "ready", "failed"].includes(
              String(record.content_status),
            )
          ) {
            console.error("Bookmark processing response contained an invalid record.");
            return;
          }

          cacheServerBookmark({
            id: record.id,
            url: record.url,
            domain: record.domain,
            title: typeof record.title === "string" ? record.title : record.domain,
            description:
              typeof record.description === "string"
                ? record.description
                : null,
            canonicalUrl:
              typeof record.canonical_url === "string"
                ? record.canonical_url
                : null,
            imageUrl:
              typeof record.image_url === "string" ? record.image_url : null,
            faviconUrl:
              typeof record.favicon_url === "string"
                ? record.favicon_url
                : null,
            contentType: toBookmarkContentType(record.content_type),
            contentStatus: record.content_status as SavedBookmark["contentStatus"],
            createdAt: record.created_at,
            tags: Array.isArray(record.tags)
              ? record.tags.filter(
                  (tag): tag is string => typeof tag === "string",
                )
              : [],
            collection:
              typeof record.collection === "string"
                ? record.collection
                : "Unsorted",
            savedReason:
              typeof record.saved_reason === "string"
                ? record.saved_reason
                : "",
          });

          if (
            record.content_status !== "pending" &&
            record.content_status !== "processing"
          ) {
            return;
          }
        }
      })().finally(() => pollingBookmarks.delete(bookmarkId));
    }

    async function syncPendingBookmark() {
      let url: string | null;
      try {
        url = readPendingBookmark(window.localStorage);
      } catch (error) {
        console.error("The pending onboarding bookmark is invalid.", error);
        toast.error(
          "Your first bookmark could not be read.",
          "It is still on this device. Return to onboarding and save the link again.",
        );
        return;
      }
      if (!url) return;

      try {
        const response = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url }),
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (
          response.status === 409 &&
          typeof payload === "object" &&
          payload !== null &&
          "code" in payload &&
          payload.code === "BOOKMARK_ALREADY_EXISTS" &&
          "bookmarkId" in payload &&
          typeof payload.bookmarkId === "string"
        ) {
          clearPendingBookmark(window.localStorage, url);
          toast.info("This bookmark is already in your library.");
          return;
        }

        if (
          !response.ok ||
          typeof payload !== "object" ||
          payload === null ||
          !("bookmark" in payload) ||
          typeof payload.bookmark !== "object" ||
          payload.bookmark === null
        ) {
          throw new Error(
            `Pending bookmark could not be saved (HTTP ${response.status}).`,
          );
        }

        const record = payload.bookmark as Record<string, unknown>;
        if (
          typeof record.id !== "string" ||
          typeof record.url !== "string" ||
          typeof record.domain !== "string"
        ) {
          throw new Error("Pending bookmark response was invalid.");
        }

        cacheServerBookmark({
          id: record.id,
          url: record.url,
          domain: record.domain,
          title: typeof record.title === "string" ? record.title : record.domain,
          description:
            typeof record.description === "string" ? record.description : null,
          contentStatus:
            record.contentStatus === "pending" ||
            record.contentStatus === "processing" ||
            record.contentStatus === "ready" ||
            record.contentStatus === "failed"
              ? record.contentStatus
              : undefined,
        });
        clearPendingBookmark(window.localStorage, url);
        notifyBookmarkSaved();
        toast.success("Your first bookmark was saved to your library.");
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Could not sync the pending onboarding bookmark.", error);
          toast.error(
            "Your bookmark is still saved on this device.",
            "We couldn't add it to your library. Refresh the page to try again.",
          );
        }
      }
    }

    async function syncBookmarks() {
      try {
        await syncPendingBookmark();
        if (controller.signal.aborted) return;

        const response = await fetch("/api/bookmarks", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          const message =
            typeof payload === "object" &&
            payload !== null &&
            "error" in payload &&
            typeof payload.error === "string"
              ? payload.error
              : "Bookmarks could not be loaded.";
          throw new Error(message);
        }

        if (
          typeof payload !== "object" ||
          payload === null ||
          !("bookmarks" in payload) ||
          !Array.isArray(payload.bookmarks)
        ) {
          throw new Error("Bookmark list response was invalid.");
        }

        const bookmarks = payload.bookmarks.map((value): SavedBookmark => {
          if (
            typeof value !== "object" ||
            value === null ||
            !("id" in value) ||
            typeof value.id !== "string" ||
            !("url" in value) ||
            typeof value.url !== "string" ||
            !("domain" in value) ||
            typeof value.domain !== "string" ||
            !("created_at" in value) ||
            typeof value.created_at !== "string"
          ) {
            throw new Error("Bookmark list contained an invalid record.");
          }

          const record = value as DatabaseBookmark;
          return {
            id: record.id,
            url: record.url,
            canonicalUrl: record.canonical_url,
            domain: record.domain,
            savedAt: record.created_at,
            title: record.title,
            description: record.description ?? "",
            imageUrl: record.image_url,
            contentType: record.content_type ?? undefined,
            faviconUrl: record.favicon_url,
            contentStatus: record.content_status,
            favorite: record.is_favorite,
            archived: record.is_archived,
            unread: !record.is_read,
            tags: record.tags,
            collection: record.collection ?? "Unsorted",
            notes: record.notes ?? "",
            savedReason: record.saved_reason ?? "",
            ...(record.intent
              ? { intent: toBookmarkIntent(record.intent) }
              : {}),
          };
        });

        if (!controller.signal.aborted) {
          replaceBookmarksFromDatabase(bookmarks);
          for (const bookmark of bookmarks) {
            if (
              bookmark.contentStatus === "pending" ||
              bookmark.contentStatus === "processing"
            ) {
              startBookmarkPolling(bookmark.id);
            }
          }
        }

      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Could not synchronize bookmarks from Supabase.", error);
        }
      }
    }

    function handleBookmarkSaved(event: Event) {
      if (
        event instanceof CustomEvent &&
        typeof event.detail?.bookmarkId === "string"
      ) {
        startBookmarkPolling(event.detail.bookmarkId);
      }
    }

    window.addEventListener(bookmarkSavedEvent, handleBookmarkSaved);
    void syncBookmarks();
    return () => {
      window.removeEventListener(bookmarkSavedEvent, handleBookmarkSaved);
      controller.abort();
    };
  }, [pathname, toast]);

  return null;
}
