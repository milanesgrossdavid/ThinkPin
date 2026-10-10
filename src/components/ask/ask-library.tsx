"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Globe2,
  LoaderCircle,
  Send,
  Sparkles,
} from "lucide-react";
import type { AskResponse } from "../../lib/ask/types";
import type { GlobalSearchResult } from "../../lib/ask/web-search";
import { GlobalSearchResults } from "./global-search-results";
import { AskSourcesList } from "./ask-sources-list";

type SearchScope = "library" | "web";

function isAskResponse(value: unknown): value is AskResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "answer" in value &&
    typeof value.answer === "string" &&
    "query" in value &&
    typeof value.query === "string" &&
    "sources" in value &&
    Array.isArray(value.sources) &&
    value.sources.every(
      (source) =>
        typeof source === "object" &&
        source !== null &&
        "bookmarkId" in source &&
        typeof source.bookmarkId === "string" &&
        "title" in source &&
        typeof source.title === "string" &&
        "url" in source &&
        typeof source.url === "string" &&
        "domain" in source &&
        typeof source.domain === "string" &&
        (!("chunkId" in source) || typeof source.chunkId === "string") &&
        "relevanceScore" in source &&
        typeof source.relevanceScore === "number",
    )
  );
}

function isGlobalSearchResponse(
  value: unknown,
): value is { query: string; results: GlobalSearchResult[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "query" in value &&
    typeof value.query === "string" &&
    "results" in value &&
    Array.isArray(value.results) &&
    value.results.every(
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
  );
}

const librarySuggestions = [
  "¿Qué herramientas de IA guardé para desarrollo web?",
  "What have I saved about building better habits?",
  "Find articles I saved about React and TypeScript",
];
const webSuggestions = [
  "UI libraries for glassmorphism",
  "Best open-source tools for web design",
  "React component libraries with accessible components",
];

export function AskLibrary({
  initialQuestion,
}: {
  initialQuestion: string;
}) {
  const [question, setQuestion] = useState(initialQuestion);
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [globalResults, setGlobalResults] = useState<GlobalSearchResult[] | null>(
    null,
  );
  const [scope, setScope] = useState<SearchScope>("library");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function ask(event?: FormEvent<HTMLFormElement>, nextQuestion = question) {
    event?.preventDefault();
    const normalizedQuestion = nextQuestion.trim();
    if (!normalizedQuestion || isLoading) return;
    const searchScope = scope;

    setQuestion(normalizedQuestion);
    setError("");
    setResponse(null);
    setGlobalResults(null);
    setIsLoading(true);
    try {
      const isGlobalSearch = searchScope === "web";
      const result = await fetch(
        isGlobalSearch ? "/api/ask/global-search" : "/api/ask",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "idempotency-key": crypto.randomUUID(),
          },
          body: JSON.stringify(
            isGlobalSearch
              ? { query: normalizedQuestion }
              : { question: normalizedQuestion },
          ),
        },
      );
      const payload: unknown = await result.json();
      if (!result.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : isGlobalSearch
              ? "Global search could not be completed."
              : "Your library could not be queried right now.";
        throw new Error(message);
      }
      if (isGlobalSearch) {
        if (!isGlobalSearchResponse(payload)) {
          throw new Error("The global search response was invalid.");
        }
        setGlobalResults(payload.results);
      } else {
        if (!isAskResponse(payload)) {
          throw new Error("The library search response was invalid.");
        }
        setResponse(payload);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : searchScope === "web"
            ? "Global search could not be completed."
            : "Your library could not be queried right now.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const suggestions =
    scope === "web" ? webSuggestions : librarySuggestions;

  return (
    <main data-ask-shell className="min-h-svh bg-background px-4 pb-16 pt-6 sm:px-8 sm:pt-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/app"
          className="text-sm font-medium text-text-muted transition-colors hover:text-text"
        >
          ← Your Memory
        </Link>

        <header data-ask-header className="mt-6 text-center sm:mt-8">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
            <Sparkles aria-hidden="true" className="size-5" />
          </span>
          <h1 data-page-title className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-text sm:text-4xl">
            Ask your library
          </h1>
          <p data-page-summary className="mx-auto mt-3 max-w-xl text-sm leading-6 text-text-muted sm:text-base">
            Ask about sources you&apos;ve saved to get grounded answers, or switch
            to web search when you need something new.
          </p>
        </header>

        <div
          role="group"
          aria-label="Search location"
          className="mx-auto mt-6 flex w-fit gap-1 rounded-full bg-surface p-1"
        >
          {(
            [
              ["library", "My library"],
              ["web", "Global web search"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              disabled={isLoading}
              aria-pressed={scope === value}
              onClick={() => {
                setScope(value);
                setError("");
                setResponse(null);
                setGlobalResults(null);
              }}
              className={`inline-flex min-h-9 items-center gap-2 rounded-full px-4 text-xs font-medium transition-colors ${
                scope === value
                  ? "bg-surface-elevated text-text shadow-sm"
                  : "text-text-muted hover:text-text"
              }`}
            >
              {value === "web" && (
                <Globe2 aria-hidden="true" className="size-3.5" />
              )}
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={(event) => void ask(event)} className="mt-6 sm:mt-8">
          <label htmlFor="ask-library-question" className="sr-only">
            {scope === "web"
              ? "Search the web"
              : "Ask your library a question"}
          </label>
          <div className="flex items-end gap-2 rounded-3xl border border-border/70 bg-surface-elevated p-2 shadow-sm transition-[border-color,box-shadow] focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 sm:p-3">
            <textarea
              id="ask-library-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={
                scope === "web"
                  ? "e.g. UI libraries for glassmorphism"
                  : "What did I save about..."
              }
              rows={2}
              maxLength={scope === "web" ? 400 : 1_000}
              disabled={isLoading}
              className="max-h-40 min-h-14 flex-1 resize-y bg-transparent px-3 py-3 text-sm leading-6 text-text outline-none placeholder:text-text-muted/75 disabled:opacity-70 sm:px-4 sm:text-base"
            />
            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="mb-1 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Ask question"
            >
              {isLoading ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              ) : (
                <Send aria-hidden="true" className="size-4" />
              )}
            </button>
          </div>
          <p className="mt-2 text-right text-xs text-text-muted">
            {question.length}/{scope === "web" ? "400" : "1,000"}
          </p>
        </form>

        {!response && !globalResults && !error && !isLoading && (
          <section aria-label="Example questions" className="mt-6">
            <p className="mb-3 text-center text-xs font-medium text-text-muted">
              TRY ASKING
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setQuestion(suggestion);
                    void ask(undefined, suggestion);
                  }}
                  className="rounded-full border border-border/70 bg-surface-elevated px-3.5 py-2 text-xs text-text-muted transition-colors hover:border-primary/35 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </section>
        )}

        {isLoading && (
          <div
            role="status"
            className="mt-10 flex items-center justify-center gap-3 text-sm text-text-muted"
          >
            <LoaderCircle
              aria-hidden="true"
              className="size-4 animate-spin text-primary"
            />
            Searching your saved library...
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mt-8 rounded-2xl border border-error/30 bg-error/5 p-4 text-sm leading-6 text-text"
          >
            {error}
          </p>
        )}

        {scope === "library" && response && (
          <>
            <section
              aria-labelledby="ask-answer-heading"
              className="mt-8 rounded-3xl border border-border/70 bg-surface-elevated p-5 shadow-sm sm:p-7"
            >
              <h2
                id="ask-answer-heading"
                className="text-xs font-semibold uppercase tracking-[0.12em] text-primary"
              >
                Answer
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-text sm:text-base">
                {response.answer}
              </p>
            </section>
            <AskSourcesList sources={response.sources} />
          </>
        )}
        {scope === "web" && globalResults && (
          <GlobalSearchResults results={globalResults} />
        )}
      </div>
    </main>
  );
}
