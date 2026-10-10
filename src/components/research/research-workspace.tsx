"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  FileText,
  FlaskConical,
  Globe2,
  Lightbulb,
  ListChecks,
  Network,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { saveBookmarkAction } from "../../app/actions/bookmarks";
import {
  addResearchSourceAction,
  createResearchNoteAction,
  deleteResearchProjectAction,
  generateResearchSummaryAction,
  removeResearchNoteAction,
  removeResearchSourceAction,
  updateResearchProjectStatusAction,
} from "../../app/actions/research";
import type {
  ResearchNote,
  ResearchProject,
  ResearchProjectStatus,
  ResearchSource,
} from "../../types/research";
import type { GlobalSearchResult } from "../../lib/ask/web-search";
import { notifyBookmarkSaved } from "../../lib/bookmarks";

type WorkspaceSource = {
  source: ResearchSource;
  bookmark: {
    id: string;
    title: string;
    description: string | null;
    url: string;
    domain: string;
    imageUrl: string | null;
    contentType: string | null;
    archived: boolean;
  };
};

type LibraryBookmark = {
  id: string;
  title: string;
  url: string;
  domain: string;
};

const views = [
  { id: "sources", label: "Sources", icon: BookOpen },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "insights", label: "Insights", icon: Lightbulb },
  { id: "claims", label: "Claims", icon: ListChecks },
  { id: "entities", label: "Entities", icon: Network },
] as const;
type WorkspaceView = (typeof views)[number]["id"];

export function ResearchWorkspace({
  project,
  initialSources,
  initialNotes,
  libraryBookmarks,
}: {
  project: ResearchProject;
  initialSources: WorkspaceSource[];
  initialNotes: ResearchNote[];
  libraryBookmarks: LibraryBookmark[];
}) {
  const router = useRouter();
  const [sources, setSources] = useState(initialSources);
  const [notes, setNotes] = useState(initialNotes);
  const [status, setStatus] = useState(project.status);
  const [activeView, setActiveView] = useState<WorkspaceView>("sources");
  const [sourceMode, setSourceMode] = useState<"library" | "web" | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [query, setQuery] = useState("");
  const [webQuery, setWebQuery] = useState("");
  const [webResults, setWebResults] = useState<GlobalSearchResult[] | null>(
    null,
  );
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [message, setMessage] = useState("");
  const [report, setReport] = useState<{
    summary: string;
    sources: { bookmarkId: string; title: string; url: string; domain: string }[];
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const includedIds = useMemo(
    () => new Set(sources.map(({ source }) => source.bookmarkId)),
    [sources],
  );
  const filteredBookmarks = libraryBookmarks.filter((bookmark) => {
    const search = query.trim().toLocaleLowerCase();
    return (
      !includedIds.has(bookmark.id) &&
      (!search ||
        `${bookmark.title} ${bookmark.domain}`.toLocaleLowerCase().includes(search))
    );
  });

  function addSource(bookmark: LibraryBookmark) {
    setMessage("");
    startTransition(async () => {
      const result = await addResearchSourceAction(project.id, bookmark.id);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setSources((current) => [
        {
          source: result.data,
          bookmark: {
            ...bookmark,
            description: null,
            imageUrl: null,
            contentType: null,
            archived: false,
          },
        },
        ...current,
      ]);
    });
  }

  async function searchWeb(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedQuery = webQuery.trim();
    if (!normalizedQuery || isSearchingWeb) return;

    setMessage("");
    setWebResults(null);
    setIsSearchingWeb(true);
    try {
      const response = await fetch("/api/ask/global-search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: normalizedQuery }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const error =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Web search could not be completed.";
        throw new Error(error);
      }
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("results" in payload) ||
        !Array.isArray(payload.results) ||
        !payload.results.every(
          (result) =>
            typeof result === "object" &&
            result !== null &&
            "title" in result &&
            typeof result.title === "string" &&
            "url" in result &&
            typeof result.url === "string" &&
            "domain" in result &&
            typeof result.domain === "string" &&
            "description" in result &&
            typeof result.description === "string",
        )
      ) {
        throw new Error("Web search returned an invalid response.");
      }
      setWebResults(payload.results);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Web search could not be completed.",
      );
    } finally {
      setIsSearchingWeb(false);
    }
  }

  function addWebResult(result: GlobalSearchResult) {
    setMessage("");
    startTransition(async () => {
      const saved = await saveBookmarkAction(result.url);
      if (!saved.ok) {
        setMessage(saved.error);
        return;
      }
      if (!saved.duplicate) notifyBookmarkSaved();

      const added = await addResearchSourceAction(project.id, saved.bookmark.id);
      if (!added.ok) {
        setMessage(
          `The bookmark was saved to your library, but couldn't be added to this research: ${added.error}`,
        );
        return;
      }

      setSources((current) => [
        {
          source: added.data,
          bookmark: {
            id: saved.bookmark.id,
            title: result.title,
            description: result.description,
            url: saved.bookmark.url,
            domain: saved.bookmark.domain,
            imageUrl: null,
            contentType: null,
            archived: false,
          },
        },
        ...current,
      ]);
    });
  }

  function removeSource(sourceId: string) {
    setMessage("");
    startTransition(async () => {
      const result = await removeResearchSourceAction(sourceId);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setSources((current) =>
        current.filter(({ source }) => source.id !== sourceId),
      );
    });
  }

  function addNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      const result = await createResearchNoteAction(project.id, noteDraft);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setNotes((current) => [result.data, ...current]);
      setNoteDraft("");
    });
  }

  function removeNote(noteId: string) {
    setMessage("");
    startTransition(async () => {
      const result = await removeResearchNoteAction(noteId);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setNotes((current) => current.filter((note) => note.id !== noteId));
    });
  }

  function setProjectStatus(nextStatus: ResearchProjectStatus) {
    setMessage("");
    startTransition(async () => {
      const result = await updateResearchProjectStatusAction(
        project.id,
        nextStatus,
      );
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setStatus(nextStatus);
    });
  }

  function deleteProject() {
    setMessage("");
    startTransition(async () => {
      const result = await deleteResearchProjectAction(project.id);
      if (!result.ok) {
        setMessage(result.error);
        setShowDeleteConfirmation(false);
        return;
      }
      router.push("/app/research");
      router.refresh();
    });
  }

  function generateReport() {
    setMessage("");
    setReport(null);
    startTransition(async () => {
      const result = await generateResearchSummaryAction(
        project.id,
        crypto.randomUUID(),
      );
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setReport(result.data);
    });
  }

  const selectedView = views.find((view) => view.id === activeView);

  return (
    <main className="min-h-svh bg-background px-4 pb-24 pt-6 sm:px-8 sm:pt-9">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/app/research"
          className="text-sm font-medium text-text-muted transition-colors hover:text-text"
        >
          ← All research
        </Link>
        <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <FlaskConical aria-hidden="true" className="size-4" />
              Research workspace
            </p>
            <h1 data-page-title className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.045em] text-text sm:text-4xl">
              {project.title}
            </h1>
            {project.description && (
              <p data-page-summary className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
                {project.description}
              </p>
            )}
            <span className="mt-3 inline-flex rounded-full border border-border px-2.5 py-1 text-[11px] capitalize text-text-muted">
              {status}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setShowDeleteConfirmation(true)}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-error/30 px-3 text-sm font-medium text-error transition-colors hover:bg-error/5 disabled:opacity-50"
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Delete
            </button>
            <label className="sr-only" htmlFor="research-project-status">
              Project status
            </label>
            <select
              id="research-project-status"
              value={status}
              disabled={isPending}
              onChange={(event) =>
                setProjectStatus(event.target.value as ResearchProjectStatus)
              }
              className="h-10 rounded-full border border-border bg-surface-elevated px-3 text-xs text-text outline-none focus:border-primary"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
            <button
              type="button"
              disabled={isPending || sources.length === 0}
              onClick={generateReport}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles aria-hidden="true" className="size-4" />
              Generate report
            </button>
          </div>
        </header>
        <p className="mt-3 text-xs leading-5 text-text-muted">
          Research uses sources you add from your library or discover on the
          web. Reports need indexed bookmark content; newly saved links may
          take a moment to process.
        </p>

        {message && (
          <p role="alert" className="mt-4 text-sm text-error">
            {message}
          </p>
        )}

        {showDeleteConfirmation && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-research-title"
            aria-describedby="delete-research-description"
          >
            <div className="w-full max-w-md rounded-3xl border border-border bg-surface-elevated p-6 shadow-xl">
              <h2
                id="delete-research-title"
                className="text-lg font-semibold text-text"
              >
                Delete this research workspace?
              </h2>
              <p
                id="delete-research-description"
                className="mt-2 text-sm leading-6 text-text-muted"
              >
                “{project.title}” and its research notes and source links will
                be permanently deleted. Bookmarks will remain in your library.
              </p>
              {message && (
                <p role="alert" className="mt-3 text-sm text-error">
                  {message}
                </p>
              )}
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setShowDeleteConfirmation(false)}
                  className="min-h-10 rounded-full px-4 text-sm font-medium text-text-muted transition-colors hover:bg-background disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={deleteProject}
                  className="min-h-10 rounded-full bg-error px-4 text-sm font-medium text-white transition-colors hover:bg-error/90 disabled:opacity-50"
                >
                  {isPending ? "Deleting…" : "Delete workspace"}
                </button>
              </div>
            </div>
          </div>
        )}

        {report && (
          <section
            aria-labelledby="research-report-title"
            className="mt-8 rounded-3xl border border-border/70 bg-surface-elevated p-6 shadow-sm sm:p-8"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 pb-5">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2
                    id="research-report-title"
                    className="text-lg font-semibold text-text"
                  >
                    Research report
                  </h2>
                  <p className="mt-1 text-sm text-text-muted">
                    Summary based on the sources selected for this project.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReport(null)}
                className="rounded-full px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:bg-background hover:text-text"
              >
                Dismiss
              </button>
            </div>
            <div className="mx-auto mt-7 max-w-3xl whitespace-pre-wrap text-[15px] leading-4 text-text">
              {report.summary}
            </div>
            <div className="mt-8 border-t border-border/70 pt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Sources used
              </h3>
              <ol className="mt-3 flex flex-wrap gap-2">
                {report.sources.map((source, index) => (
                  <li key={source.bookmarkId}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 py-2 text-xs font-medium text-primary transition-colors hover:border-primary/30 hover:bg-primary/5"
                    >
                      <span className="shrink-0 text-text-muted">
                        [{index + 1}]
                      </span>
                      <span className="truncate">{source.title}</span>
                      <ArrowUpRight
                        aria-hidden="true"
                        className="size-3.5 shrink-0"
                      />
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        <nav
          aria-label="Research workspace views"
          className="mt-8 flex gap-1 overflow-x-auto border-b border-border"
        >
          {views.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={activeView === id ? "page" : undefined}
              onClick={() => setActiveView(id)}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors ${
                activeView === id
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </button>
          ))}
        </nav>

        <section className="mt-6" aria-labelledby="research-view-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2
                id="research-view-title"
                className="text-xl font-semibold tracking-[-0.03em] text-text"
              >
                {selectedView?.label}
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                {activeView === "sources"
                  ? "Selected bookmarks keep this investigation grounded in your library."
                  : activeView === "notes"
                    ? "Your notes capture your own thinking, separately from source material."
                    : "These research views are being developed; nothing is generated or presented as a finding yet."}
              </p>
            </div>
            {activeView === "sources" && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSourceMode((mode) =>
                      mode === "library" ? null : "library",
                    )
                  }
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 text-xs font-medium text-text transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <Plus aria-hidden="true" className="size-3.5" />
                  Add from library
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSourceMode((mode) => (mode === "web" ? null : "web"))
                  }
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 text-xs font-medium text-text transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <Globe2 aria-hidden="true" className="size-3.5" />
                  Search the web
                </button>
              </div>
            )}
          </div>

          {activeView === "sources" && (
            <>
              {sourceMode === "library" && (
                <div className="mt-4 rounded-2xl border border-border/70 bg-surface-elevated p-4">
                  <label
                    htmlFor="research-source-search"
                    className="text-xs font-medium text-text-muted"
                  >
                    Find a bookmark in your library
                  </label>
                  <input
                    id="research-source-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by title or domain"
                    className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                  <ul className="mt-3 max-h-72 list-none divide-y divide-border/60 overflow-y-auto p-0">
                    {filteredBookmarks.slice(0, 30).map((bookmark) => (
                      <li
                        key={bookmark.id}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text">
                            {bookmark.title}
                          </p>
                          <p className="truncate text-xs text-text-muted">
                            {bookmark.domain}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => addSource(bookmark)}
                          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-primary/25 px-3 text-xs font-medium text-primary hover:bg-primary/5 disabled:opacity-50"
                        >
                          <Plus aria-hidden="true" className="size-3.5" />
                          Add
                        </button>
                      </li>
                    ))}
                    {filteredBookmarks.length === 0 && (
                      <li className="py-4 text-center text-sm text-text-muted">
                        No matching bookmarks available.
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {sourceMode === "web" && (
                <div className="mt-4 rounded-2xl border border-border/70 bg-surface-elevated p-4">
                  <form
                    onSubmit={searchWeb}
                    className="flex flex-col gap-2 sm:flex-row"
                  >
                    <label className="sr-only" htmlFor="research-web-search">
                      Search the web for research sources
                    </label>
                    <input
                      id="research-web-search"
                      required
                      maxLength={400}
                      value={webQuery}
                      onChange={(event) => setWebQuery(event.target.value)}
                      placeholder="Search the web for sources"
                      className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                    <button
                      type="submit"
                      disabled={isSearchingWeb}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
                    >
                      <Search aria-hidden="true" className="size-4" />
                      {isSearchingWeb ? "Searching…" : "Search"}
                    </button>
                  </form>
                  <p className="mt-2 text-xs leading-5 text-text-muted">
                    Choose a result to save it to your library and add it as a
                    source for this project.
                  </p>
                  {webResults && (
                    <ul className="mt-3 max-h-96 list-none divide-y divide-border/60 overflow-y-auto p-0">
                      {webResults.map((result) => {
                        const alreadyAdded = sources.some(
                          ({ bookmark }) => bookmark.url === result.url,
                        );
                        return (
                          <li
                            key={result.url}
                            className="flex items-center gap-3 py-3"
                          >
                            <div className="min-w-0 flex-1">
                              <a
                                href={result.url}
                                target="_blank"
                                rel="noreferrer"
                                className="line-clamp-2 text-sm font-medium text-text hover:text-primary"
                              >
                                {result.title}
                              </a>
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-muted">
                                {result.description}
                              </p>
                              <p className="mt-1 text-[11px] text-text-muted">
                                {result.domain}
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={isPending || alreadyAdded}
                              onClick={() => addWebResult(result)}
                              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-primary/25 px-3 text-xs font-medium text-primary hover:bg-primary/5 disabled:opacity-50"
                            >
                              {alreadyAdded ? (
                                <>
                                  <Check
                                    aria-hidden="true"
                                    className="size-3.5"
                                  />
                                  Added
                                </>
                              ) : (
                                <>
                                  <Plus
                                    aria-hidden="true"
                                    className="size-3.5"
                                  />
                                  Add to research
                                </>
                              )}
                            </button>
                          </li>
                        );
                      })}
                      {webResults.length === 0 && (
                        <li className="py-4 text-center text-sm text-text-muted">
                          No web results found. Try a different search.
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              )}

              {sources.length ? (
                <ul className="mt-4 list-none divide-y divide-border/70 rounded-2xl border border-border/70 bg-surface-elevated p-0">
                  {sources.map(({ source, bookmark }) => (
                    <li
                      key={source.id}
                      className="flex items-center justify-between gap-3 p-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text">
                          {bookmark.title}
                        </p>
                        <a
                          href={bookmark.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 truncate text-xs text-text-muted hover:text-primary"
                        >
                          {bookmark.domain}
                          <ArrowUpRight
                            aria-hidden="true"
                            className="size-3 shrink-0"
                          />
                        </a>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Link
                          href={`/app/bookmarks/${bookmark.id}`}
                          aria-label={`Open ${bookmark.title} in your library`}
                          className="grid size-8 place-items-center rounded-full text-text-muted hover:bg-background hover:text-primary"
                        >
                          <ArrowUpRight aria-hidden="true" className="size-4" />
                        </Link>
                        <button
                          type="button"
                          aria-label={`Remove ${bookmark.title} from research`}
                          disabled={isPending}
                          onClick={() => removeSource(source.id)}
                          className="grid size-8 place-items-center rounded-full text-text-muted hover:bg-error/10 hover:text-error disabled:opacity-50"
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-border px-5 py-12 text-center">
                  <BookOpen
                    aria-hidden="true"
                    className="mx-auto size-5 text-text-muted"
                  />
                  <p className="mt-2 text-sm font-medium text-text">
                    No sources selected
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    Add saved bookmarks to ground this research project.
                  </p>
                </div>
              )}
            </>
          )}

          {activeView === "notes" && (
            <>
              <form
                onSubmit={addNote}
                className="mt-4 rounded-2xl border border-border/70 bg-surface-elevated p-4"
              >
                <label
                  htmlFor="research-note-draft"
                  className="text-sm font-medium text-text"
                >
                  Your thoughts
                </label>
                <textarea
                  id="research-note-draft"
                  required
                  maxLength={10_000}
                  rows={4}
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder="Capture an observation, question, or comparison…"
                  className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-6 text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground disabled:opacity-50"
                  >
                    <Plus aria-hidden="true" className="size-3.5" />
                    Add note
                  </button>
                </div>
              </form>
              {notes.length ? (
                <ul className="mt-4 list-none space-y-3 p-0">
                  {notes.map((note) => (
                    <li
                      key={note.id}
                      className="rounded-2xl border border-border/70 bg-surface-elevated p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="whitespace-pre-wrap text-sm leading-6 text-text">
                          {note.content}
                        </p>
                        <button
                          type="button"
                          aria-label="Delete note"
                          disabled={isPending}
                          onClick={() => removeNote(note.id)}
                          className="grid size-8 shrink-0 place-items-center rounded-full text-text-muted hover:bg-error/10 hover:text-error disabled:opacity-50"
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                        </button>
                      </div>
                      <time
                        dateTime={note.createdAt}
                        className="mt-3 block text-[11px] text-text-muted"
                      >
                        {new Intl.DateTimeFormat("en", {
                          dateStyle: "medium",
                        }).format(new Date(note.createdAt))}
                      </time>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-5 text-sm text-text-muted">
                  Your project notes will appear here.
                </p>
              )}
            </>
          )}

          {activeView !== "sources" && activeView !== "notes" && (
            <div className="mt-4 rounded-2xl border border-dashed border-border px-5 py-12 text-center">
              {activeView === "insights" ? (
                <Lightbulb
                  aria-hidden="true"
                  className="mx-auto size-5 text-text-muted"
                />
              ) : activeView === "claims" ? (
                <Check
                  aria-hidden="true"
                  className="mx-auto size-5 text-text-muted"
                />
              ) : (
                <Network
                  aria-hidden="true"
                  className="mx-auto size-5 text-text-muted"
                />
              )}
              <p className="mt-2 text-sm font-medium text-text">
                {selectedView?.label} are not available yet
              </p>
              <p className="mt-1 text-xs text-text-muted">
                We&apos;ll add traceable, source-backed {activeView} here in a
                future step.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
