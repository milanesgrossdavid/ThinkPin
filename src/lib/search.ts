import type { LibraryBookmark } from "../components/bookmarks/mock-bookmarks";

export type SearchMode = "keyword" | "full-text" | "semantic" | "ai";

export type SearchState = {
  query: string;
  results: LibraryBookmark[];
  topics: string[];
  mode: SearchMode;
};

const semanticTerms: Record<string, string[]> = {
  authentication: ["auth", "login", "sign in", "oauth", "sessions", "identity"],
  auth: ["authentication", "login", "sign in", "oauth", "sessions"],
  "sign-in": ["authentication", "auth", "login", "oauth"],
  signin: ["authentication", "auth", "login", "oauth"],
  learn: ["guide", "tutorial", "learning", "explained", "course"],
  buy: ["shopping", "product", "compare", "things to buy"],
  design: ["ux", "interface", "product design", "visual"],
  "next.js": ["nextjs", "next js"],
  "nextjs": ["next.js", "next js"],
};

const stopWords = new Set([
  "about",
  "anything",
  "did",
  "find",
  "for",
  "from",
  "have",
  "i",
  "me",
  "my",
  "of",
  "recently",
  "save",
  "saved",
  "show",
  "the",
  "what",
  "where",
  "which",
  "with",
]);

function queryTerms(query: string) {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.-]+/gu, " ")
    .split(/\s+/)
    .filter((term) => term.length > 1 && !stopWords.has(term));
}

export function searchBookmarks(
  bookmarks: LibraryBookmark[],
  query: string,
  mode: Exclude<SearchMode, "ai">,
  notesByBookmark: Record<string, string> = {},
) {
  const terms = queryTerms(query);
  if (terms.length === 0) {
    return [];
  }

  const expandedTerms =
    mode === "semantic"
      ? [
          ...new Set(
            terms.flatMap((term) => [
              term,
              ...(semanticTerms[term] ?? []),
            ]),
          ),
        ]
      : terms;

  return bookmarks
    .map((bookmark) => {
      const primaryText = [bookmark.title, bookmark.domain]
        .join(" ")
        .toLowerCase();
      const fullText = [
        bookmark.description,
        bookmark.topic,
        bookmark.subtopic,
        ...(bookmark.tags ?? []),
        ...bookmark.searchTerms,
        notesByBookmark[bookmark.id] ?? "",
      ]
        .join(" ")
        .toLowerCase();
      const searchable =
        mode === "keyword" ? primaryText : `${primaryText} ${fullText}`;
      const matchedTerms = expandedTerms.filter((term) =>
        searchable.includes(term),
      );

      return {
        bookmark,
        score: matchedTerms.length,
        matchedTerms,
      };
    })
    .filter((result) => result.score > 0)
    .sort(
      (first, second) =>
        second.score - first.score ||
        first.bookmark.title.localeCompare(second.bookmark.title),
    )
    .map((result) => result.bookmark);
}

export function relatedTopics(
  results: LibraryBookmark[],
  query: string,
  mode: Exclude<SearchMode, "ai">,
) {
  const querySet = new Set(queryTerms(query).map((term) => term.toLowerCase()));
  const counts = new Map<string, number>();

  results.forEach((bookmark) => {
    [
      bookmark.subtopic,
      ...(bookmark.tags ?? []),
      bookmark.topic,
    ].forEach((topic) => {
      if (!querySet.has(topic.toLowerCase())) {
        counts.set(topic, (counts.get(topic) ?? 0) + 1);
      }
    });
  });

  if (mode === "semantic") {
    Object.entries(semanticTerms).forEach(([term, related]) => {
      if (querySet.has(term)) {
        related.forEach((topic) => counts.set(topic, (counts.get(topic) ?? 0) + 1));
      }
    });
  }

  return [...counts.entries()]
    .sort((first, second) => second[1] - first[1])
    .slice(0, 6)
    .map(([topic]) => topic);
}
