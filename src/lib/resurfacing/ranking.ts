import type {
  ResurfacingBookmark,
  ResurfacingCandidate,
} from "./types";

export const RESURFACING_MINIMUM_AGE_DAYS = 30;

const weights = {
  semanticSimilarity: 0.35,
  recentActivity: 0.25,
  topicOverlap: 0.15,
  intentSimilarity: 0.1,
  collectionRelationship: 0.05,
  interestRecency: 0.05,
  bookmarkQuality: 0.05,
} as const;

type RecentSignal = ResurfacingBookmark;

function ageLabel(createdAt: string, now: number): string {
  const daysOld = Math.max(
    1,
    Math.floor((now - new Date(createdAt).getTime()) / 86_400_000),
  );
  if (daysOld < 60) return `${daysOld} days ago`;
  const months = Math.floor(daysOld / 30);
  if (months < 18) return `${months} ${months === 1 ? "month" : "months"} ago`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}

function tokenSet(values: string[]): Set<string> {
  return new Set(
    values
      .flatMap((value) => value.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u))
      .filter((value) => value.length > 2),
  );
}

export function rankResurfacingCandidates(input: {
  candidates: ResurfacingBookmark[];
  recentSignals: RecentSignal[];
  semanticScores: Map<string, number>;
  excludedBookmarkIds: Set<string>;
  now?: number;
  limit?: number;
}): ResurfacingCandidate[] {
  const now = input.now ?? Date.now();
  const nowDate = new Date(now);
  const recentTags = tokenSet(input.recentSignals.flatMap((signal) => signal.tags));
  const recentIntents = new Set(
    input.recentSignals
      .map((signal) => signal.intent)
      .filter((intent): intent is string => Boolean(intent)),
  );
  const recentCollections = new Set(
    input.recentSignals
      .map((signal) => signal.collection?.toLocaleLowerCase())
      .filter((collection): collection is string => Boolean(collection)),
  );
  const recentTopicTokens = tokenSet(
    input.recentSignals.flatMap((signal) => [
      signal.title,
      signal.description ?? "",
      signal.intent ?? "",
      ...signal.tags,
    ]),
  );
  const activityRecency = input.recentSignals.reduce(
    (maximum, signal) => {
      const ageDays = Math.max(
        0,
        (now - new Date(signal.createdAt).getTime()) / 86_400_000,
      );
      return Math.max(maximum, Math.exp(-ageDays / 7));
    },
    0,
  );

  return input.candidates
    .filter((bookmark) => {
      if (input.excludedBookmarkIds.has(bookmark.id)) return false;
      const ageDays =
        (now - new Date(bookmark.createdAt).getTime()) / 86_400_000;
      if (ageDays < RESURFACING_MINIMUM_AGE_DAYS) return false;
      if (bookmark.lastOpenedAt) {
        const daysSinceOpened =
          (now - new Date(bookmark.lastOpenedAt).getTime()) / 86_400_000;
        if (daysSinceOpened < RESURFACING_MINIMUM_AGE_DAYS) return false;
      }
      return true;
    })
    .map((bookmark) => {
      const semanticSimilarity = Math.max(
        0,
        Math.min(1, input.semanticScores.get(bookmark.id) ?? 0),
      );
      const bookmarkTags = tokenSet(bookmark.tags);
      const tagIntersection = [...bookmarkTags].filter((tag) =>
        recentTags.has(tag),
      ).length;
      const topicTokens = tokenSet([
        bookmark.title,
        bookmark.description ?? "",
        bookmark.intent ?? "",
        ...bookmark.tags,
      ]);
      const topicIntersection = [...topicTokens].filter((token) =>
        recentTopicTokens.has(token),
      ).length;
      const topicOverlap =
        bookmarkTags.size > 0
          ? tagIntersection / bookmarkTags.size
          : Math.min(1, topicIntersection / 3);
      const intentSimilarity =
        bookmark.intent && recentIntents.has(bookmark.intent) ? 1 : 0;
      const collectionRelationship =
        bookmark.collection &&
        recentCollections.has(bookmark.collection.toLocaleLowerCase())
          ? 1
          : 0;
      const ageDays = Math.max(
        0,
        (now - new Date(bookmark.createdAt).getTime()) / 86_400_000,
      );
      const interestRecency = Math.exp(-ageDays / 365);
      const bookmarkQuality =
        bookmark.contentStatus === "ready"
          ? 1
          : bookmark.description
            ? 0.65
            : 0.35;
      const relevanceScore =
        semanticSimilarity * weights.semanticSimilarity +
        activityRecency * weights.recentActivity +
        topicOverlap * weights.topicOverlap +
        intentSimilarity * weights.intentSimilarity +
        collectionRelationship * weights.collectionRelationship +
        interestRecency * weights.interestRecency +
        bookmarkQuality * weights.bookmarkQuality;
      const overlappingTags = bookmark.tags.filter((tag) =>
        recentTags.has(tag.toLocaleLowerCase()),
      );
      const recentRelated = input.recentSignals.find((signal) =>
        signal.intent && signal.intent === bookmark.intent,
      );
      const reason = overlappingTags.length
        ? `Matches topics you've saved recently: ${overlappingTags.slice(0, 2).join(", ")}.`
        : recentRelated
          ? `Related to your recent bookmark “${recentRelated.title}”.`
          : "Related to what you've been saving recently.";

      return {
        ...bookmark,
        relevanceScore,
        reason,
        ageLabel: ageLabel(bookmark.createdAt, nowDate.getTime()),
      };
    })
    .filter(
      (candidate) =>
        candidate.relevanceScore >= 0.4 &&
        (input.semanticScores.has(candidate.id) ||
          candidate.reason.startsWith("Matches topics")),
    )
    .sort((first, second) => second.relevanceScore - first.relevanceScore)
    .slice(0, input.limit ?? 3);
}
