import {
  ArrowDownRight,
  BrainCircuit,
  Braces,
  Clapperboard,
  Layers3,
  Palette,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { Bookmark } from "./types";
import {
  mockBookmarks as bookmarkData,
  type MockBookmark,
} from "../../lib/mock/bookmarks";

export type LibraryBookmark = Omit<
  Bookmark,
  "icon" | "artwork" | "contentType"
> & {
  icon: LucideIcon;
  artwork: string;
  contentType: "article" | "video" | "repository" | "product";
  favorite: boolean;
  unread: boolean;
  savedDate: string;
  searchTerms: string[];
};

const bookmarkPresentation: Record<
  string,
  { icon: LucideIcon; artwork: string }
> = {
  "nextjs-authentication": {
    icon: Braces,
    artwork: "from-blue-500/20 via-indigo-500/10 to-transparent",
  },
  "practical-guide-rag": {
    icon: BrainCircuit,
    artwork: "from-violet-500/20 via-fuchsia-500/10 to-transparent",
  },
  "designing-calm-interfaces": {
    icon: Palette,
    artwork: "from-rose-500/20 via-orange-400/10 to-transparent",
  },
  "building-resilient-ui": {
    icon: Layers3,
    artwork: "from-cyan-500/20 via-sky-500/10 to-transparent",
  },
  "creative-practice": {
    icon: Sparkles,
    artwork: "from-amber-500/20 via-yellow-500/10 to-transparent",
  },
  "useful-search": {
    icon: ArrowDownRight,
    artwork: "from-emerald-500/20 via-teal-500/10 to-transparent",
  },
  "react-server-components": {
    icon: Clapperboard,
    artwork: "from-red-500/20 via-orange-500/10 to-transparent",
  },
  "supabase-auth-nextjs": {
    icon: Braces,
    artwork: "from-emerald-500/20 via-teal-500/10 to-transparent",
  },
  "oauth-patterns": {
    icon: Braces,
    artwork: "from-indigo-500/20 via-violet-500/10 to-transparent",
  },
};

function withPresentation(bookmark: MockBookmark): LibraryBookmark {
  const presentation = bookmarkPresentation[bookmark.id];
  if (!presentation) {
    throw new Error(`Missing presentation for mock bookmark "${bookmark.id}".`);
  }
  return {
    ...bookmark,
    savedAt: bookmark.savedLabel,
    savedDate: bookmark.createdAt.slice(0, 10),
    favorite: bookmark.isFavorite,
    unread: !bookmark.isRead,
    ...presentation,
  };
}

export const mockBookmarks: LibraryBookmark[] = bookmarkData.map(withPresentation);
