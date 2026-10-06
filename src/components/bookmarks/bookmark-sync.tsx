"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  replaceBookmarksFromDatabase,
  type BookmarkIntent,
  type SavedBookmark,
} from "../../lib/bookmarks";

type DatabaseBookmark = {
  id: string;
  url: string;
  canonical_url: string | null;
  title: string;
  description: string | null;
  domain: string;
  favicon_url: string | null;
  image_url: string | null;
  intent: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  is_read: boolean;
  content_status: SavedBookmark["contentStatus"];
  created_at: string;
  tags: string[];
  collection: string | null;
  notes: string | null;
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

export function BookmarkSync() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith("/app")) {
      return;
    }

    const controller = new AbortController();
    async function syncBookmarks() {
      try {
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
            faviconUrl: record.favicon_url,
            contentStatus: record.content_status,
            favorite: record.is_favorite,
            archived: record.is_archived,
            unread: !record.is_read,
            tags: record.tags,
            collection: record.collection ?? "Unsorted",
            notes: record.notes ?? "",
            ...(record.intent
              ? { intent: toBookmarkIntent(record.intent) }
              : {}),
          };
        });

        if (!controller.signal.aborted) {
          replaceBookmarksFromDatabase(bookmarks);
        }

      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Could not synchronize bookmarks from Supabase.", error);
        }
      }
    }

    void syncBookmarks();
    return () => controller.abort();
  }, [pathname]);

  return null;
}
