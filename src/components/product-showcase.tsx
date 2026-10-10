import {
  Bookmark,
  BookOpen,
  Check,
  Command,
  FileText,
  Folder,
  Globe2,
  Heart,
  Link2,
  Search,
  Sparkles,
  Tags,
} from "lucide-react";
import type { ReactNode } from "react";

const libraryItems = [
  {
    title: "A saved article",
    domain: "example.com",
    category: "Research",
    color: "from-violet-100 to-indigo-50 dark:from-violet-950 dark:to-indigo-950",
    icon: FileText,
  },
  {
    title: "A saved guide",
    domain: "example.org",
    category: "Reading",
    color: "from-orange-100 to-rose-50 dark:from-orange-950 dark:to-rose-950",
    icon: BookOpen,
  },
  {
    title: "A saved resource",
    domain: "example.net",
    category: "Reference",
    color: "from-slate-200 to-slate-50 dark:from-slate-700 dark:to-slate-800",
    icon: Globe2,
  },
];

const searchResults = [
  {
    title: "A saved article about databases",
    domain: "example.com",
    match: "Matches your search",
  },
  {
    title: "A guide to online tools",
    domain: "example.org",
    match: "Matches your search",
  },
  {
    title: "A database reference",
    domain: "example.net",
    match: "Matches your search",
  },
];

const aiSources = [
  { title: "Saved link 1", domain: "example.com" },
  { title: "Saved link 2", domain: "example.org" },
];

function BrowserFrame({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`overflow-hidden rounded-[24px] border border-border/50 bg-surface-elevated shadow-[0_24px_80px_-40px_rgba(0,0,0,0.26)] ring-1 ring-text/[0.03] ${className}`}
    >
      <div className="flex h-11 items-center gap-1.5 border-b border-border/50 bg-surface px-4">
        <span className="size-2 rounded-full bg-[#ff5f57]" />
        <span className="size-2 rounded-full bg-[#febc2e]" />
        <span className="size-2 rounded-full bg-[#28c840]" />
        <div className="mx-auto flex h-6 w-[48%] items-center justify-center rounded-full bg-background text-[10px] text-text-muted">
          thinkpin.app
        </div>
      </div>
      {children}
    </div>
  );
}

function LibraryMockup() {
  return (
    <BrowserFrame label="Illustrative library preview">
      <div className="flex min-h-[300px] sm:min-h-[375px]">
        <aside className="hidden w-40 shrink-0 border-r border-border bg-surface/70 p-4 sm:block">
          <div className="mb-7 flex items-center gap-2 text-xs font-semibold text-text">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-white">
              <Bookmark className="size-3.5" />
            </span>
            ThinkPin
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex items-center gap-2 rounded-md bg-primary/10 px-2 py-1.5 font-medium text-primary">
              <Bookmark className="size-3.5" />
              All bookmarks
            </div>
            {[
              { label: "Collections", icon: Folder },
              { label: "Tags", icon: Tags },
              { label: "Favorites", icon: Heart },
            ].map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-2 py-1.5 text-text-muted"
              >
                <Icon className="size-3.5" />
                {label}
              </div>
            ))}
          </div>
        </aside>

        <div className="min-w-0 flex-1 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-text-muted">Your library</p>
              <h3 className="mt-1 text-sm font-semibold text-text sm:text-base">
                All bookmarks
              </h3>
            </div>
            <span
              className="flex h-7 items-center gap-1.5 rounded-md bg-primary px-2.5 text-[10px] font-medium text-white"
            >
              <Bookmark className="size-3" />
              Save new
            </span>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-background/70 px-3 py-2">
            <Search className="size-3.5 text-text-muted" />
            <span className="text-[10px] text-text-muted">
              Search your library
            </span>
            <kbd className="ml-auto hidden items-center gap-0.5 rounded border border-border px-1 py-0.5 text-[9px] text-text-muted sm:flex">
              <Command className="size-2.5" /> K
            </kbd>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
            {libraryItems.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="overflow-hidden rounded-xl border border-border/50 bg-surface"
                >
                  <div
                    className={`flex h-16 items-center justify-center bg-gradient-to-br ${item.color} sm:h-20`}
                  >
                    <Icon className="size-5 text-text-muted/80" />
                  </div>
                  <div className="p-2 sm:p-2.5">
                    <p className="truncate text-[10px] font-medium text-text sm:text-[11px]">
                      {item.title}
                    </p>
                    <p className="mt-1 truncate text-[9px] text-text-muted">
                      {item.domain}
                    </p>
                    <span className="mt-2 inline-flex rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary">
                      {item.category}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function SearchMockup() {
  return (
    <BrowserFrame label="Illustrative search preview">
      <div className="min-h-[300px] p-4 sm:min-h-[345px] sm:p-6">
        <p className="mb-3 text-[10px] font-medium text-text-muted">
          Example search
        </p>
        <div className="flex items-center gap-2 rounded-xl border border-primary/25 bg-background px-3.5 py-3 shadow-sm ring-2 ring-primary/[0.06]">
          <Search className="size-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate text-xs text-text sm:text-sm">
            that AI database I read about...
          </span>
          <span className="hidden rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-white sm:inline-flex">
            Search
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[10px] font-medium text-text-muted">
            Example results
          </p>
        </div>
        <div className="mt-2 divide-y divide-border/70">
          {searchResults.map((result, index) => (
            <article key={result.title} className="flex gap-3 py-3">
              <span
                className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                  index === 0
                    ? "bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300"
                    : "bg-background text-text-muted"
                }`}
              >
                {index === 0 ? (
                  <Sparkles className="size-4" />
                ) : (
                  <FileText className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-xs font-medium text-text sm:text-sm">
                  {result.title}
                </h3>
                <p className="mt-1 truncate text-[10px] text-text-muted">
                  {result.domain} <span aria-hidden="true">·</span>{" "}
                  {result.match}
                </p>
              </div>
              {index === 0 && (
                <Check className="mt-1 size-3.5 shrink-0 text-success" />
              )}
            </article>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}

function AiMockup() {
  return (
    <BrowserFrame label="Illustrative Ask Your Library preview">
      <div className="min-h-[300px] p-4 sm:min-h-[345px] sm:p-6">
        <div className="flex items-center gap-2 text-[10px] font-medium text-text-muted">
          <Sparkles className="size-3.5 text-primary" />
          Ask your library
        </div>
        <p className="mt-1 text-[10px] text-text-muted">
          Illustrative example
        </p>
        <div className="mt-3 rounded-lg border border-border bg-background/70 px-3 py-2.5 text-xs leading-5 text-text">
          What should I use to build an AI app?
        </div>
        <div className="mt-4 rounded-xl border border-primary/15 bg-primary/[0.035] p-3.5 sm:p-4">
          <div className="flex items-center gap-2 text-[10px] font-semibold text-primary">
            <Sparkles className="size-3.5" />
            ANSWER FROM YOUR LIBRARY
          </div>
          <p className="mt-2.5 text-xs leading-5 text-text sm:text-sm sm:leading-6">
            ThinkPin can summarize relevant information from the links in your
            library and include sources to revisit.
          </p>
          <div className="mt-4 border-t border-border/80 pt-3">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">
              Example sources
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {aiSources.map((source) => (
                <li
                  key={source.title}
                  className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-surface-elevated px-2 py-1 text-[9px] text-text"
                >
                  <Link2 className="size-2.5 text-primary" />
                  {source.title}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

const showcaseItems = [
  {
    id: "features",
    eyebrow: "Your personal library",
    title: (
      <>
        A calmer home
        <br className="hidden sm:block" /> for your links.
      </>
    ),
    description:
      "Save links to articles, videos, tools, repositories, and more. Add tags and collections, mark favorites, and keep your references in one private library.",
    mockup: <LibraryMockup />,
  },
  {
    id: "search",
    eyebrow: "Search your library",
    title: (
      <>
        Find saved links.
        <br />
        Search by title or keyword.
      </>
    ),
    description:
      "Search saved titles, descriptions, and tags. When semantic embeddings are enabled, search by the idea you remember—even if you don't know the exact words.",
    mockup: <SearchMockup />,
  },
  {
    id: "ai",
    eyebrow: "Ask Your Library · Pro",
    title: (
      <>
        Turn your saved knowledge
        <br className="hidden sm:block" /> into answers.
      </>
    ),
    description:
      "Ask a question about your saved links and get an AI-generated response with sources to revisit. Requires Pro and an available AI provider.",
    mockup: <AiMockup />,
  },
];

export function ProductShowcase() {
  return (
    <section
      aria-label="Explore the product"
      data-scroll-reveal
      className="overflow-hidden bg-surface-elevated px-5 py-24 sm:px-8 sm:py-28 lg:py-32"
    >
      <div className="mx-auto max-w-container-xl">
        <div className="space-y-24 sm:space-y-32 lg:space-y-40">
          {showcaseItems.map((item, index) => (
            <article
              key={item.eyebrow}
              id={item.id}
              className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16"
            >
              <div
                className={`lg:col-span-4 ${
                  index % 2 === 1 ? "lg:order-2 lg:col-start-9" : ""
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  {item.eyebrow}
                </p>
                <h2 className="mt-4 font-heading text-4xl leading-[1.02] tracking-tight text-text sm:text-5xl">
                  {item.title}
                </h2>
                <p className="mt-5 max-w-md text-sm leading-6 text-text-muted sm:text-base sm:leading-7">
                  {item.description}
                </p>
              </div>
              <div
                className={`min-w-0 lg:col-span-8 ${
                  index % 2 === 1 ? "lg:order-1 lg:col-start-1 lg:row-start-1" : ""
                }`}
              >
                {item.mockup}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
