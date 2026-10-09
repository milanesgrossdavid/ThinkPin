import { load } from "cheerio";
import {
  InvalidBookmarkUrlError,
  validateBookmarkUrl,
} from "../bookmarks/validate-url";
import { normalizeUrl } from "../ingestion/normalize-url";

export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ITEMS = 10_000;

export type ParsedBrowserBookmark = {
  position: number;
  url: string | null;
  normalizedUrl: string | null;
  title: string;
  folderPath: string[];
  status: "pending" | "invalid";
  error: string | null;
};

export function parseBrowserBookmarks(html: string): ParsedBrowserBookmark[] {
  const $ = load(html);
  const anchors = $("a[href]");
  if (anchors.length === 0) {
    throw new Error("This file does not contain any HTML bookmarks.");
  }
  if (anchors.length > MAX_IMPORT_ITEMS) {
    throw new Error(
      `This file contains more than ${MAX_IMPORT_ITEMS.toLocaleString()} links. Split it into smaller exports and try again.`,
    );
  }

  const items: ParsedBrowserBookmark[] = [];
  anchors.each((index, anchor) => {
    const element = $(anchor);
    const href = element.attr("href")?.trim() ?? "";
    const folderPath = element
      .parents("dl")
      .toArray()
      .reverse()
      .flatMap((folder) => {
        const name = $(folder).prevAll("h3").first().text().trim();
        return name ? [name.slice(0, 100)] : [];
      });
    const title = element.text().trim().replace(/\s+/g, " ").slice(0, 500);

    try {
      const validated = validateBookmarkUrl(href);
      items.push({
        position: index,
        url: validated.originalUrl,
        normalizedUrl: normalizeUrl(validated.normalizedUrl),
        title,
        folderPath,
        status: "pending",
        error: null,
      });
    } catch (error) {
      if (!(error instanceof InvalidBookmarkUrlError)) throw error;
      items.push({
        position: index,
        url: null,
        normalizedUrl: null,
        title,
        folderPath,
        status: "invalid",
        error: error.message,
      });
    }
  });
  return items;
}
