import type { Bookmark } from "@/types";

type MockBookmarkSeed = {
  id: string;
  title: string;
  description: string;
  topic: string;
  subtopic: string;
  tags: string[];
  domain: string;
  url: string;
  savedAt: string;
  contentType: "article" | "video" | "repository" | "product";
  favorite: boolean;
  unread: boolean;
  savedDate: string;
  searchTerms: string[];
};

export type MockBookmark = Omit<Bookmark, "contentType"> & {
  contentType: "article" | "video" | "repository" | "product";
  topic: string;
  subtopic: string;
  tags: string[];
  savedLabel: string;
  searchTerms: string[];
};

const bookmarkSeeds: MockBookmarkSeed[] = [
  {
    id: "nextjs-authentication",
    title: "Next.js Authentication",
    description:
      "Authentication patterns and tutorials for modern Next.js applications, from sessions to protected routes.",
    topic: "Development",
    subtopic: "Authentication",
    tags: ["Next.js", "Authentication", "Development", "Security"],
    domain: "github.com",
    url: "https://github.com/nextauthjs/next-auth",
    savedAt: "2 hours ago",
    savedDate: "2026-10-02",
    contentType: "repository",
    favorite: true,
    unread: true,
    searchTerms: ["tutorial", "auth", "sign in", "login", "web development"],
  },
  {
    id: "practical-guide-rag",
    title: "A practical guide to RAG",
    description:
      "How retrieval-augmented generation connects language models to useful source material.",
    topic: "AI",
    subtopic: "Knowledge systems",
    tags: ["AI", "RAG", "Research"],
    domain: "developer.ibm.com",
    url: "https://developer.ibm.com/",
    savedAt: "Yesterday",
    savedDate: "2026-10-01",
    contentType: "article",
    favorite: false,
    unread: true,
    searchTerms: ["artificial intelligence", "semantic search", "llm"],
  },
  {
    id: "designing-calm-interfaces",
    title: "Designing calm interfaces",
    description:
      "Principles for creating focused digital spaces with less noise and more intention.",
    topic: "Design",
    subtopic: "Product design",
    tags: ["UX", "Product design", "Design"],
    domain: "www.nngroup.com",
    url: "https://www.nngroup.com/",
    savedAt: "2 days ago",
    savedDate: "2026-09-30",
    contentType: "article",
    favorite: true,
    unread: false,
    searchTerms: ["ux", "user experience", "interface"],
  },
  {
    id: "building-resilient-ui",
    title: "Building resilient UI",
    description:
      "Small interface patterns that make web applications clearer and more dependable.",
    topic: "Development",
    subtopic: "Frontend",
    tags: ["Frontend", "Web development", "Patterns"],
    domain: "web.dev",
    url: "https://web.dev/",
    savedAt: "3 days ago",
    savedDate: "2026-09-29",
    contentType: "video",
    favorite: false,
    unread: false,
    searchTerms: ["web development", "frontend", "tutorial"],
  },
  {
    id: "creative-practice",
    title: "Notes on creative practice",
    description:
      "A collection of ideas about finding momentum and making room for better work.",
    topic: "Inspiration",
    subtopic: "Creativity",
    tags: ["Creativity", "Ideas"],
    domain: "nesslabs.com",
    url: "https://nesslabs.com/",
    savedAt: "5 days ago",
    savedDate: "2026-09-27",
    contentType: "product",
    favorite: false,
    unread: true,
    searchTerms: ["ideas", "creative", "productivity"],
  },
  {
    id: "useful-search",
    title: "The shape of useful search",
    description:
      "Why good search helps people reconnect with the context behind what they saved.",
    topic: "Research",
    subtopic: "Information architecture",
    tags: ["Search", "Research", "Memory"],
    domain: "alistapart.com",
    url: "https://alistapart.com/",
    savedAt: "1 week ago",
    savedDate: "2026-09-25",
    contentType: "article",
    favorite: true,
    unread: false,
    searchTerms: ["rediscovery", "information retrieval", "research"],
  },
  {
    id: "react-server-components",
    title: "React Server Components explained",
    description:
      "A video walkthrough of server components, rendering, and data fetching in React.",
    topic: "Development",
    subtopic: "React",
    tags: ["React", "Next.js", "Video", "Development"],
    domain: "youtube.com",
    url: "https://www.youtube.com/",
    savedAt: "8 months ago",
    savedDate: "2026-02-02",
    contentType: "video",
    favorite: false,
    unread: false,
    searchTerms: ["video", "tutorial", "react", "web development"],
  },
  {
    id: "supabase-auth-nextjs",
    title: "Supabase Auth with Next.js",
    description:
      "A practical guide to setting up Supabase authentication in a Next.js application.",
    topic: "Development",
    subtopic: "Authentication",
    tags: ["Supabase", "Authentication", "Next.js"],
    domain: "supabase.com",
    url: "https://supabase.com/docs/guides/auth/server-side/nextjs",
    savedAt: "Yesterday",
    savedDate: "2026-10-01",
    contentType: "article",
    favorite: false,
    unread: true,
    searchTerms: ["auth", "sessions", "middleware", "login"],
  },
  {
    id: "oauth-patterns",
    title: "OAuth Patterns for Web Apps",
    description:
      "A field guide to OAuth flows, token handling, and secure sign-in patterns.",
    topic: "Development",
    subtopic: "Authentication",
    tags: ["OAuth", "Authentication", "Security"],
    domain: "auth0.com",
    url: "https://auth0.com/docs/get-started/authentication-and-authorization-flow",
    savedAt: "4 days ago",
    savedDate: "2026-09-28",
    contentType: "article",
    favorite: false,
    unread: false,
    searchTerms: ["auth", "identity", "sign in", "security"],
  },
];

export const mockBookmarks: MockBookmark[] = bookmarkSeeds.map(
  ({ savedAt, savedDate, favorite, unread, ...bookmark }) => ({
    ...bookmark,
    contentStatus: "ready",
    createdAt: `${savedDate}T12:00:00.000Z`,
    isFavorite: favorite,
    isArchived: false,
    isRead: !unread,
    savedLabel: savedAt,
  }),
);
