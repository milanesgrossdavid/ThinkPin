import {
  Bookmark,
  BookOpen,
  Check,
  Clock3,
  Command,
  FileText,
  Folder,
  Globe2,
  LayoutGrid,
  Link2,
  Search,
  Sparkles,
  Tags,
} from "lucide-react";
import type { ReactNode } from "react";

const libraryItems = [
  {
    title: "The future of personal knowledge",
    domain: "every.to",
    category: "Research",
    color: "from-violet-100 to-indigo-50 dark:from-violet-950 dark:to-indigo-950",
    icon: FileText,
  },
  {
    title: "A field guide to design",
    domain: "read.cv",
    category: "Inspiration",
    color: "from-orange-100 to-rose-50 dark:from-orange-950 dark:to-rose-950",
    icon: BookOpen,
  },
  {
    title: "Build with AI",
    domain: "vercel.com",
    category: "Tools",
    color: "from-slate-200 to-slate-50 dark:from-slate-700 dark:to-slate-800",
    icon: Globe2,
  },
];

const searchResults = [
  {
    title: "A practical guide to building AI products",
    domain: "every.to",
    match: "Saved while researching AI tools",
  },
  {
    title: "The new stack for AI applications",
    domain: "vercel.com",
    match: "Connected to your Supabase resources",
  },
  {
    title: "Embeddings and semantic search",
    domain: "supabase.com",
    match: "Related to vector databases",
  },
];

const aiSources = [
  { title: "OpenAI documentation", domain: "platform.openai.com" },
  { title: "LangChain", domain: "langchain.com" },
  { title: "Supabase", domain: "supabase.com" },
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
    <BrowserFrame label="Library dashboard preview">
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
              <LayoutGrid className="size-3.5" />
              All resources
              <span className="ml-auto text-[10px]">128</span>
            </div>
            {[
              { label: "Collections", icon: Folder },
              { label: "Topics", icon: Tags },
              { label: "Recently saved", icon: Clock3 },
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
                All resources
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
    <BrowserFrame label="Semantic search preview">
      <div className="min-h-[300px] p-4 sm:min-h-[345px] sm:p-6">
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
            Results from your memory
          </p>
          <span className="text-[10px] text-text-muted">3 found</span>
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
    <BrowserFrame label="AI answer from saved resources preview">
      <div className="min-h-[300px] p-4 sm:min-h-[345px] sm:p-6">
        <div className="flex items-center gap-2 text-[10px] font-medium text-text-muted">
          <Sparkles className="size-3.5 text-primary" />
          Ask your library
        </div>
        <div className="mt-3 rounded-lg border border-border bg-background/70 px-3 py-2.5 text-xs leading-5 text-text">
          What should I use to build an AI app?
        </div>
        <div className="mt-4 rounded-xl border border-primary/15 bg-primary/[0.035] p-3.5 sm:p-4">
          <div className="flex items-center gap-2 text-[10px] font-semibold text-primary">
            <Sparkles className="size-3.5" />
            ANSWER FROM YOUR LIBRARY
          </div>
          <p className="mt-2.5 text-xs leading-5 text-text sm:text-sm sm:leading-6">
            Based on what you&apos;ve saved, Supabase is a strong fit for your
            database and auth. Pair it with Vercel AI SDK to build your app.
          </p>
          <div className="mt-4 border-t border-border/80 pt-3">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">
              Sources from your library
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
        Your entire Internet,
        <br className="hidden sm:block" /> organized.
      </>
    ),
    description:
      "Everything you save, together in one calm, searchable place. No folders to maintain and no links left behind.",
    mockup: <LibraryMockup />,
  },
  {
    id: "search",
    eyebrow: "Search by meaning",
    title: (
      <>
        Find anything.
        <br />
        Even when you don&apos;t remember what it was called.
      </>
    ),
    description:
      "Search the idea, topic, or detail you remember. Your library helps bring the right resource back.",
    mockup: <SearchMockup />,
  },
  {
    id: "ai",
    eyebrow: "Answers from your library",
    title: (
      <>
        Turn your saved knowledge
        <br className="hidden sm:block" /> into answers.
      </>
    ),
    description:
      "Ask a question and get a response grounded in the things you chose to save, with sources you can revisit.",
    mockup: <AiMockup />,
  },
];

export function ProductShowcase() {
  return (
    <section
      aria-label="Explore the product"
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
