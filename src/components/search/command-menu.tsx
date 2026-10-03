"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookmarkPlus,
  Command,
  FolderPlus,
  Heart,
  LayoutDashboard,
  Library,
  Search,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  getBookmarkDetailsSnapshot,
  getBookmarksSnapshot,
  getServerBookmarkDetailsSnapshot,
  getServerBookmarksSnapshot,
  loadSavedBookmarks,
  readBookmarkDetailState,
  subscribeToBookmarkDetails,
  subscribeToBookmarks,
} from "../../lib/bookmarks";
import { mockBookmarks, type LibraryBookmark } from "../bookmarks/mock-bookmarks";
import { searchBookmarks } from "../../lib/search";
import { requestSmartSave } from "../../lib/save-dialog";

type CommandItem = {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  shortcut?: string;
  icon: LucideIcon;
  href: string | ((query: string) => string);
  section: string;
};

const commands: CommandItem[] = [
  {
    id: "search",
    label: "Search bookmarks",
    description: "Find something in your memory",
    keywords: ["search", "find", "bookmarks", "memory"],
    shortcut: "⌘ ↵",
    icon: Search,
    href: (query) => `/search${query ? `?q=${encodeURIComponent(query)}` : ""}`,
    section: "Recent",
  },
  {
    id: "add-bookmark",
    label: "Add bookmark",
    description: "Save a link to your memory",
    keywords: ["add", "save", "bookmark", "link", "new"],
    shortcut: "N",
    icon: BookmarkPlus,
    href: "/save",
    section: "Actions",
  },
  {
    id: "create-collection",
    label: "Create collection",
    description: "Start a new intentional group",
    keywords: ["create", "new", "collection", "group"],
    icon: FolderPlus,
    href: "/collections?action=create",
    section: "Actions",
  },
  {
    id: "favorites",
    label: "Open favorites",
    description: "Bookmarks you marked as favorites",
    keywords: ["favorite", "favorites", "heart", "liked"],
    icon: Heart,
    href: "/library?filter=favorites",
    section: "Navigation",
  },
  {
    id: "dashboard",
    label: "Open dashboard",
    description: "Your personal memory at a glance",
    keywords: ["dashboard", "home", "overview"],
    shortcut: "G D",
    icon: LayoutDashboard,
    href: "/dashboard",
    section: "Navigation",
  },
  {
    id: "library",
    label: "Open library",
    description: "Browse everything you've saved",
    keywords: ["library", "bookmarks", "saved"],
    shortcut: "G L",
    icon: Library,
    href: "/library",
    section: "Navigation",
  },
  {
    id: "collections",
    label: "Open collections",
    description: "Browse your intentional groups",
    keywords: ["collections", "groups"],
    shortcut: "G C",
    icon: FolderPlus,
    href: "/collections",
    section: "Navigation",
  },
  {
    id: "ask-ai",
    label: "Ask AI",
    description: "Get an answer grounded in your bookmarks",
    keywords: ["ai", "ask", "answer", "assistant"],
    icon: Sparkles,
    href: (query) =>
      `/search?mode=ai${query ? `&q=${encodeURIComponent(query)}` : ""}`,
    section: "AI",
  },
];

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

function savedBookmarks(snapshot: string | null): LibraryBookmark[] {
  if (!snapshot) {
    return [];
  }

  return loadSavedBookmarks(snapshot).map((bookmark) => ({
    ...bookmark,
    topic: bookmark.collection,
    subtopic: bookmark.intent ?? "Saved",
    icon: Library,
    artwork: "from-primary/15 via-sky-500/10 to-transparent",
    contentType: "article",
    favorite: bookmark.favorite ?? false,
    unread: true,
    savedDate: bookmark.savedAt.slice(0, 10),
    searchTerms: [bookmark.collection, bookmark.intent ?? "", bookmark.url],
  }));
}

export function CommandMenu() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const sequenceRef = useRef("");
  const sequenceTimeoutRef = useRef<number | null>(null);
  const bookmarksSnapshot = useSyncExternalStore(
    subscribeToBookmarks,
    getBookmarksSnapshot,
    getServerBookmarksSnapshot,
  );
  const detailsSnapshot = useSyncExternalStore(
    subscribeToBookmarkDetails,
    getBookmarkDetailsSnapshot,
    getServerBookmarkDetailsSnapshot,
  );
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (open) {
      const timeout = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(timeout);
    }
  }, [open]);

  const localBookmarks = useMemo(() => {
    try {
      return savedBookmarks(bookmarksSnapshot);
    } catch {
      return [];
    }
  }, [bookmarksSnapshot]);
  const availableBookmarks = useMemo(
    () => {
      const bookmarks = [...localBookmarks, ...mockBookmarks];
      if (!detailsSnapshot) {
        return bookmarks;
      }
      try {
        const entries: unknown = JSON.parse(detailsSnapshot);
        if (
          !Array.isArray(entries) ||
          !entries.every(
            (entry) =>
              Array.isArray(entry) &&
              entry.length === 2 &&
              typeof entry[0] === "string" &&
              typeof entry[1] === "string",
          )
        ) {
          return bookmarks;
        }
        const details = new Map(
          entries.map(([id, value]: [string, string]) => [
            id,
            readBookmarkDetailState(value),
          ]),
        );
        return bookmarks
          .map((bookmark) => {
            const detail = details.get(bookmark.id);
            return {
              ...bookmark,
              title: detail?.title ?? bookmark.title,
              description: detail?.description ?? bookmark.description,
              topic: detail?.collection ?? bookmark.topic,
              tags: detail?.tags ?? bookmark.tags,
              intent: detail?.intent ?? bookmark.intent,
              favorite: detail?.favorite ?? bookmark.favorite,
              archived: detail?.archived ?? bookmark.archived,
              deleted: detail?.deleted ?? false,
            };
          })
          .filter((bookmark) => !bookmark.archived && !bookmark.deleted);
      } catch {
        return bookmarks;
      }
    },
    [detailsSnapshot, localBookmarks],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const matchingCommands = useMemo(
    () =>
      commands.filter((command) =>
        `${command.label} ${command.description} ${command.keywords.join(" ")}`
          .toLowerCase()
          .includes(normalizedQuery),
      ),
    [normalizedQuery],
  );
  const matchingBookmarks = useMemo(
    () =>
      normalizedQuery
        ? searchBookmarks(
            availableBookmarks,
            query,
            "semantic",
          ).slice(0, 5)
        : [],
    [availableBookmarks, normalizedQuery, query],
  );

  const items = useMemo(() => {
    const searchItem = normalizedQuery
      ? [{ id: "search-all", type: "search" as const }]
      : [];
    const commandItems = matchingCommands.map((command) => ({
      id: command.id,
      type: "command" as const,
      command,
    }));
    const bookmarkItems = matchingBookmarks.map((bookmark) => ({
      id: `bookmark-${bookmark.id}`,
      type: "bookmark" as const,
      bookmark,
    }));
    return [...searchItem, ...bookmarkItems, ...commandItems];
  }, [matchingBookmarks, matchingCommands, normalizedQuery]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const navigate = useCallback((href: string) => {
    close();
    router.push(href);
  }, [close, router]);

  const runCommand = useCallback((command: CommandItem) => {
    if (command.id === "add-bookmark") {
      close();
      requestSmartSave();
      return;
    }
    const href =
      typeof command.href === "string"
        ? command.href
        : command.href(query.trim());
    navigate(href);
  }, [close, navigate, query]);

  const openSearch = useCallback((queryText = "") => {
    const encoded = queryText.trim()
      ? `?q=${encodeURIComponent(queryText.trim())}`
      : "";
    navigate(`/search${encoded}`);
  }, [navigate]);

  const safeActiveIndex = Math.min(
    activeIndex,
    Math.max(0, items.length - 1),
  );

  useEffect(() => {
    function handleOpenRequest() {
      setOpen(true);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        if (
          !open &&
          document.querySelector(
            'dialog[open], [role="dialog"][aria-modal="true"]',
          )
        ) {
          return;
        }
        event.preventDefault();
        setOpen(true);
        return;
      }

      if (event.key === "Escape" && open) {
        close();
        return;
      }

      if (open) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setActiveIndex((index) =>
            Math.max(0, Math.min(index + 1, items.length - 1)),
          );
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          setActiveIndex((index) => Math.max(index - 1, 0));
        } else if (event.key === "Enter") {
          const activeItem = items[safeActiveIndex];
          if (activeItem) {
            event.preventDefault();
            if (event.metaKey || event.ctrlKey) {
              openSearch(query);
            } else if (activeItem.type === "search") {
              openSearch(query);
            } else if (activeItem.type === "command") {
              runCommand(activeItem.command);
            } else {
              navigate(`/library/${encodeURIComponent(activeItem.bookmark.id)}`);
            }
          } else if (query.trim()) {
            event.preventDefault();
            openSearch(query);
          }
        }
        return;
      }

      if (event.key === "/" && !isTypingTarget(event.target)) {
        event.preventDefault();
        setOpen(true);
        return;
      }

      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey) {
        return;
      }

      if (
        document.querySelector(
          'dialog[open], [role="dialog"][aria-modal="true"]',
        )
      ) {
        return;
      }

      if (event.key.toLowerCase() === "g") {
        sequenceRef.current = "g";
        if (sequenceTimeoutRef.current !== null) {
          window.clearTimeout(sequenceTimeoutRef.current);
        }
        sequenceTimeoutRef.current = window.setTimeout(() => {
          sequenceRef.current = "";
        }, 800);
      } else if (sequenceRef.current === "g") {
        const destinations: Record<string, string> = {
          d: "/dashboard",
          f: "/library?filter=favorites",
          l: "/library",
          c: "/collections",
        };
        const destination = destinations[event.key.toLowerCase()];
        sequenceRef.current = "";
        if (sequenceTimeoutRef.current !== null) {
          window.clearTimeout(sequenceTimeoutRef.current);
          sequenceTimeoutRef.current = null;
        }
        if (destination) {
          event.preventDefault();
          router.push(destination);
        }
      } else if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        requestSmartSave();
      }
    }

    window.addEventListener("thinkpin:open-command-menu", handleOpenRequest);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener(
        "thinkpin:open-command-menu",
        handleOpenRequest,
      );
      window.removeEventListener("keydown", handleKeyDown);
      if (sequenceTimeoutRef.current !== null) {
        window.clearTimeout(sequenceTimeoutRef.current);
      }
    };
  }, [
    close,
    items,
    navigate,
    open,
    openSearch,
    query,
    router,
    runCommand,
    safeActiveIndex,
  ]);

  const groupedCommands = useMemo(() => {
    const grouped = new Map<string, CommandItem[]>();
    matchingCommands.forEach((command) => {
      const group = grouped.get(command.section) ?? [];
      group.push(command);
      grouped.set(command.section, group);
    });
    return [...grouped.entries()];
  }, [matchingCommands]);

  if (!open) {
    return null;
  }

  let itemIndex = normalizedQuery ? 1 : 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 px-3 pt-[12vh] backdrop-blur-[2px] sm:px-6 sm:pt-[16vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Search and commands"
        className="w-full max-w-xl overflow-hidden rounded-3xl border border-border/70 bg-surface-elevated shadow-2xl"
      >
        <label className="flex h-14 items-center gap-3 border-b border-border/60 px-4 sm:h-16 sm:px-5">
          <Search aria-hidden="true" className="size-5 shrink-0 text-text-muted" />
          <span className="sr-only">Type a command or search your memory</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder="Type a command or search..."
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted/80 sm:text-base"
          />
          <button
            type="button"
            aria-label="Close command menu"
            onClick={close}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-background hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </label>

        <div className="max-h-[min(65vh,32rem)] overflow-y-auto p-2">
          {normalizedQuery && (
            <button
              type="button"
              onMouseEnter={() => setActiveIndex(0)}
              onClick={() => openSearch(query)}
              className={`flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-left transition-colors ${
                safeActiveIndex === 0
                  ? "bg-primary/10"
                  : "hover:bg-background"
              }`}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Search aria-hidden="true" className="size-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">
                Search all results for “{query.trim()}”
              </span>
              <kbd className="shrink-0 rounded-md bg-background px-1.5 py-1 text-[10px] text-text-muted">
                ⌘ ↵ / Ctrl ↵
              </kbd>
            </button>
          )}

          {matchingBookmarks.length > 0 && (
            <section aria-label="Bookmarks">
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                Bookmarks
              </p>
              {matchingBookmarks.map((bookmark) => {
                const currentIndex = itemIndex++;
                return (
                  <button
                    key={bookmark.id}
                    type="button"
                    onMouseEnter={() => setActiveIndex(currentIndex)}
                    onClick={() =>
                      navigate(`/library/${encodeURIComponent(bookmark.id)}`)
                    }
                    className={`flex min-h-12 w-full mt-2 mb-2 items-center gap-3 rounded-2xl px-3 text-left transition-colors ${
                      safeActiveIndex === currentIndex
                        ? "bg-primary/10"
                        : "hover:bg-background"
                    }`}
                  >
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${bookmark.artwork} text-text`}
                    >
                      <bookmark.icon aria-hidden="true" className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text">
                        {bookmark.title}
                      </span>
                      <span className="block truncate text-[11px] text-text-muted">
                        {bookmark.domain}
                      </span>
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-text-muted"
                    />
                  </button>
                );
              })}
            </section>
          )}

          {groupedCommands.map(([section, sectionCommands]) => (
            <section key={section} aria-label={section} className="mt-2">
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                {section}
              </p>
              {sectionCommands.map((command) => {
                const currentIndex = itemIndex++;
                const Icon = command.icon;
                return (
                  <button
                    key={command.id}
                    type="button"
                    onMouseEnter={() => setActiveIndex(currentIndex)}
                    onClick={() => runCommand(command)}
                    className={`flex min-h-12 w-full mt-2 mb-2 items-center gap-3 rounded-2xl px-3 text-left transition-colors ${
                      safeActiveIndex === currentIndex
                        ? "bg-primary/10"
                        : "hover:bg-background"
                    }`}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-background text-text-muted">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text">
                        {command.label}
                      </span>
                      <span className="block truncate text-[11px] text-text-muted">
                        {command.description}
                      </span>
                    </span>
                    {command.shortcut && (
                      <kbd className="shrink-0 rounded-md bg-background px-1.5 py-1 text-[10px] text-text-muted">
                        {command.shortcut.replace("⌘", "⌘ / Ctrl")}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </section>
          ))}

          {normalizedQuery && matchingBookmarks.length === 0 && (
            <p className="px-3 py-3 text-xs text-text-muted">
              No bookmark matches yet. Press Enter to search your memory.
            </p>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-border/60 bg-background/60 px-4 py-2.5 text-[10px] text-text-muted sm:px-5">
          <span className="flex items-center gap-1.5">
            <Command aria-hidden="true" className="size-3" />
            ⌘ K / Ctrl K to open
          </span>
          <span>↑ ↓ navigate · Enter select · Esc close</span>
        </footer>
      </section>
    </div>
  );
}
