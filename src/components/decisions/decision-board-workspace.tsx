"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Globe2,
  Plus,
  Search,
  Scale,
  Trash2,
} from "lucide-react";
import { saveBookmarkAction } from "../../app/actions/bookmarks";
import {
  addDecisionEvidenceAction,
  deleteDecisionBoardAction,
  deleteDecisionEvidenceAction,
} from "../../app/actions/decisions";
import type { GlobalSearchResult } from "../../lib/ask/web-search";
import type {
  DecisionBoard,
  DecisionEvidence,
} from "../../types/decision";

type LibraryBookmark = {
  id: string;
  title: string;
  url: string;
  domain: string;
};

export function DecisionBoardWorkspace({
  board,
  initialEvidence,
  libraryBookmarks,
}: {
  board: DecisionBoard;
  initialEvidence: DecisionEvidence[];
  libraryBookmarks: LibraryBookmark[];
}) {
  const router = useRouter();
  const [evidence, setEvidence] = useState(initialEvidence);
  const [optionId, setOptionId] = useState(board.options[0]?.id ?? "");
  const [criterionId, setCriterionId] = useState(board.criteria[0]?.id ?? "");
  const [bookmarkId, setBookmarkId] = useState("");
  const [note, setNote] = useState("");
  const [webQuery, setWebQuery] = useState("");
  const [webResults, setWebResults] = useState<GlobalSearchResult[] | null>(
    null,
  );
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [savingWebUrl, setSavingWebUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function searchWeb(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = webQuery.trim();
    if (!query || isSearchingWeb) return;
    setMessage("");
    setWebResults(null);
    setIsSearchingWeb(true);
    try {
      const response = await fetch("/api/ask/global-search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
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

  async function addWebEvidence(result: GlobalSearchResult) {
    if (!optionId || !criterionId || savingWebUrl) return;
    setMessage("");
    setSavingWebUrl(result.url);
    try {
      const saved = await saveBookmarkAction(result.url);
      if (!saved.ok) throw new Error(saved.error);
      const added = await addDecisionEvidenceAction({
        boardId: board.id,
        optionId,
        criterionId,
        bookmarkId: saved.bookmark.id,
        note: `Web search excerpt (verify against source): ${result.description.slice(0, 650)}`,
      });
      if (!added.ok) {
        throw new Error(
          `The link was saved in your library, but it couldn't be added as evidence: ${added.error}`,
        );
      }
      setEvidence((current) => [added.data, ...current]);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Web result could not be added as evidence.",
      );
    } finally {
      setSavingWebUrl(null);
    }
  }

  function addEvidence(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      const result = await addDecisionEvidenceAction({
        boardId: board.id,
        optionId,
        criterionId,
        bookmarkId,
        note,
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setEvidence((current) => [result.data, ...current]);
      setBookmarkId("");
      setNote("");
    });
  }

  function removeEvidence(evidenceId: string) {
    setMessage("");
    startTransition(async () => {
      const result = await deleteDecisionEvidenceAction(evidenceId, board.id);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setEvidence((current) =>
        current.filter((entry) => entry.id !== evidenceId),
      );
    });
  }

  function deleteBoard() {
    setMessage("");
    startTransition(async () => {
      const result = await deleteDecisionBoardAction(board.id);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      router.push("/app/decisions");
      router.refresh();
    });
  }

  return (
    <main className="min-h-svh bg-background px-4 pb-24 pt-6 sm:px-8 sm:pt-9">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/app/decisions"
          className="text-sm font-medium text-text-muted transition-colors hover:text-text"
        >
          ← All decisions
        </Link>
        <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <Scale aria-hidden="true" className="size-4" />
              Decision board
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.045em] text-text sm:text-4xl">
              {board.title}
            </h1>
            {board.question && (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
                {board.question}
              </p>
            )}
            <p className="mt-3 text-xs leading-5 text-text-muted">
              Evidence is grouped by option and criterion. ThinkPin does not
              score the options or choose for you.
            </p>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setShowDeleteConfirmation(true)}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-error/30 px-3 text-sm font-medium text-error transition-colors hover:bg-error/5 disabled:opacity-50"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Delete board
          </button>
        </header>

        {message && (
          <p role="alert" className="mt-4 text-sm text-error">
            {message}
          </p>
        )}

        <form
          onSubmit={addEvidence}
          className="mt-7 rounded-3xl border border-border/70 bg-surface-elevated p-5 sm:p-6"
        >
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Plus aria-hidden="true" className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-text">
                Add evidence
              </h2>
              <p className="text-xs text-text-muted">
                Attach a saved bookmark, your note, or both.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-text">
              Option
              <select
                required
                value={optionId}
                onChange={(event) => setOptionId(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal text-text outline-none focus:border-primary"
              >
                {board.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-text">
              Criterion
              <select
                required
                value={criterionId}
                onChange={(event) => setCriterionId(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal text-text outline-none focus:border-primary"
              >
                {board.criteria.map((criterion) => (
                  <option key={criterion.id} value={criterion.id}>
                    {criterion.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-3 block text-xs font-medium text-text">
            Bookmark from your library
            <select
              value={bookmarkId}
              onChange={(event) => setBookmarkId(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal text-text outline-none focus:border-primary"
            >
              <option value="">No bookmark</option>
              {libraryBookmarks.map((bookmark) => (
                <option key={bookmark.id} value={bookmark.id}>
                  {bookmark.title} · {bookmark.domain}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block text-xs font-medium text-text">
            Evidence note
            <textarea
              maxLength={2_000}
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Record what this source says about this criterion…"
              className="mt-1.5 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-normal leading-6 text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </label>
          {libraryBookmarks.length === 0 && (
            <p className="mt-2 text-xs text-text-muted">
              Your library has no saved bookmarks yet. You can still add a note
              as evidence.
            </p>
          )}
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={isPending || !optionId || !criterionId}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              <Plus aria-hidden="true" className="size-3.5" />
              Add evidence
            </button>
          </div>
        </form>

        <section
          aria-labelledby="decision-web-search-title"
          className="mt-5 rounded-3xl border border-border/70 bg-surface-elevated p-5 sm:p-6"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Globe2 aria-hidden="true" className="size-4" />
            </span>
            <div>
              <h2
                id="decision-web-search-title"
                className="text-base font-semibold text-text"
              >
                Find evidence on the web
              </h2>
              <p className="text-xs text-text-muted">
                Search results can be saved and attached to the selected option
                and criterion.
              </p>
            </div>
          </div>
          <form onSubmit={searchWeb} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="decision-web-search">
              Search the web for decision evidence
            </label>
            <input
              id="decision-web-search"
              required
              maxLength={400}
              value={webQuery}
              onChange={(event) => setWebQuery(event.target.value)}
              placeholder="e.g. Cursor pricing and plan limits"
              className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
            <button
              type="submit"
              disabled={isSearchingWeb}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              <Search aria-hidden="true" className="size-4" />
              {isSearchingWeb ? "Searching…" : "Search web"}
            </button>
          </form>
          {webResults && (
            <ul className="mt-3 divide-y divide-border/60">
              {webResults.map((result) => (
                <li
                  key={result.url}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noreferrer"
                      className="line-clamp-2 text-sm font-medium text-primary hover:underline"
                    >
                      {result.title}
                      <ArrowUpRight
                        aria-hidden="true"
                        className="ml-1 inline size-3.5"
                      />
                    </a>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-muted">
                      {result.description}
                    </p>
                    <p className="mt-1 text-[11px] text-text-muted">
                      {result.domain} · Will be added to{" "}
                      {board.options.find((option) => option.id === optionId)
                        ?.label ?? "selected option"}{" "}
                      /{" "}
                      {board.criteria.find(
                        (criterion) => criterion.id === criterionId,
                      )?.label ?? "selected criterion"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={savingWebUrl !== null || isPending}
                    onClick={() => void addWebEvidence(result)}
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-primary/25 px-3 text-xs font-medium text-primary hover:bg-primary/5 disabled:opacity-50"
                  >
                    <Plus aria-hidden="true" className="size-3.5" />
                    {savingWebUrl === result.url ? "Adding…" : "Add evidence"}
                  </button>
                </li>
              ))}
              {webResults.length === 0 && (
                <li className="py-4 text-center text-sm text-text-muted">
                  No web results found. Try a different search.
                </li>
              )}
            </ul>
          )}
          <p className="mt-3 text-[11px] leading-5 text-text-muted">
            Search descriptions are provisional evidence. Open the source and
            verify details before relying on them.
          </p>
        </section>

        <section className="mt-9" aria-labelledby="comparison-title">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2
                id="comparison-title"
                className="text-xl font-semibold tracking-[-0.03em] text-text"
              >
                Comparison
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                Review the evidence you collected under each criterion.
              </p>
            </div>
            <span className="text-xs text-text-muted">
              {evidence.length} {evidence.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {board.options.map((option) => (
              <article
                key={option.id}
                className="rounded-3xl border border-border/70 bg-surface-elevated p-5"
              >
                <h3 className="text-base font-semibold text-text">
                  {option.label}
                </h3>
                <div className="mt-4 space-y-4">
                  {board.criteria.map((criterion) => {
                    const entries = evidence.filter(
                      (entry) =>
                        entry.optionId === option.id &&
                        entry.criterionId === criterion.id,
                    );
                    return (
                      <section
                        key={criterion.id}
                        className="border-t border-border/70 pt-3"
                      >
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                          {criterion.label}
                        </h4>
                        {entries.length > 0 ? (
                          <ul className="mt-2 space-y-2">
                            {entries.map((entry) => (
                              <li
                                key={entry.id}
                                className="group rounded-xl bg-background p-3"
                              >
                                {entry.bookmark && (
                                  <a
                                    href={entry.bookmark.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex max-w-full items-center gap-1 text-sm font-medium text-primary hover:underline"
                                  >
                                    <BookOpen
                                      aria-hidden="true"
                                      className="size-3.5 shrink-0"
                                    />
                                    <span className="truncate">
                                      {entry.bookmark.title}
                                    </span>
                                    <ArrowUpRight
                                      aria-hidden="true"
                                      className="size-3.5 shrink-0"
                                    />
                                  </a>
                                )}
                                {entry.note && (
                                  <p className="whitespace-pre-wrap text-sm leading-6 text-text">
                                    {entry.note}
                                  </p>
                                )}
                                <div className="mt-2 flex items-center justify-between gap-2">
                                  {entry.bookmark && (
                                    <span className="truncate text-[11px] text-text-muted">
                                      {entry.bookmark.domain}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    aria-label="Remove evidence"
                                    disabled={isPending}
                                    onClick={() => removeEvidence(entry.id)}
                                    className="ml-auto grid size-7 shrink-0 place-items-center rounded-full text-text-muted transition-colors hover:bg-error/10 hover:text-error disabled:opacity-50"
                                  >
                                    <Trash2
                                      aria-hidden="true"
                                      className="size-3.5"
                                    />
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-xs text-text-muted">
                            No evidence collected yet.
                          </p>
                        )}
                      </section>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </section>

        {showDeleteConfirmation && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-decision-title"
            aria-describedby="delete-decision-description"
          >
            <div className="w-full max-w-md rounded-3xl border border-border bg-surface-elevated p-6 shadow-xl">
              <h2
                id="delete-decision-title"
                className="text-lg font-semibold text-text"
              >
                Delete this decision board?
              </h2>
              <p
                id="delete-decision-description"
                className="mt-2 text-sm leading-6 text-text-muted"
              >
                “{board.title}” and its evidence notes will be permanently
                deleted. Bookmarks will remain in your library.
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
                  className="min-h-10 rounded-full px-4 text-sm font-medium text-text-muted hover:bg-background disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={deleteBoard}
                  className="min-h-10 rounded-full bg-error px-4 text-sm font-medium text-white disabled:opacity-50"
                >
                  {isPending ? "Deleting…" : "Delete board"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
