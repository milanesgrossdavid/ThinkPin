"use client";

import { useState } from "react";
import { Minus, Plus as PlusData } from "lucide";
import { MorphIcon } from "morphicons/react";

const questions = [
  {
    question: "What is ThinkPin?",
    answer:
      "ThinkPin is a personal library for useful links. Save, organize, and search your bookmarks, with optional AI features for supported plans.",
  },
  {
    question: "What can I save?",
    answer:
      "Save links to articles, videos, tools, products, research, GitHub repositories, and other web pages. Metadata availability depends on the source page.",
  },
  {
    question: "How does AI organize my bookmarks?",
    answer:
      "When AI organization is enabled and an AI provider is configured, ThinkPin can generate a title, summary, tags, and content type for a bookmark. You can also organize links yourself with tags and collections.",
  },
  {
    question: "Can I import my existing bookmarks?",
    answer:
      "Yes. Sign in and use Import to upload an HTML bookmarks export from your browser.",
  },
  {
    question: "Can I search by meaning?",
    answer:
      "Keyword search is available for your library. Semantic search is available when an embeddings provider is configured; it uses AI credits.",
  },
  {
    question: "How do I search my library?",
    answer:
      "Use the search field at the top of Your Library to search saved titles, descriptions, and tags. Semantic search is also available when embeddings are enabled for your account.",
  },
  {
    question: "Is my library private?",
    answer:
      "Your library is associated with your account, and access is checked by the application and database policies. If you use AI features, the relevant bookmark information is processed by the configured AI provider. Do not save sensitive information you would not want processed by that provider.",
  },
  {
    question: "What is included in Free and Pro?",
    answer:
      "Free includes 750 AI credits per month. Pro includes 3,500 monthly credits and additional features such as Ask Your Library, summaries, research, learning, and decision boards. The current subscription price is shown in checkout before you confirm payment.",
  },
  {
    question: "How do I save links from my browser?",
    answer:
      "Paste a link into ThinkPin to save it. You can also import your existing browser bookmarks using an HTML export. A browser extension is not currently available.",
  },
  {
    question: "How can I contact ThinkPin?",
    answer:
      "Use the contact form at the bottom of this page. It prepares an email in your email app; the message is only sent when you choose to send it.",
  },
];

export function FAQSection() {
  const [openQuestions, setOpenQuestions] = useState<Set<string>>(
    () => new Set(),
  );

  function toggleQuestion(question: string) {
    setOpenQuestions((current) => {
      const next = new Set(current);
      if (next.has(question)) {
        next.delete(question);
      } else {
        next.add(question);
      }
      return next;
    });
  }

  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      data-scroll-reveal
      className="bg-surface-elevated px-5 py-24 sm:px-8 sm:py-28 lg:py-32"
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-9 text-center sm:mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Good questions
          </p>
          <h2
            id="faq-title"
            className="mt-4 font-heading text-4xl leading-[1.02] tracking-tight text-text sm:text-5xl md:text-6xl"
          >
            Frequently asked questions.
          </h2>
        </div>

        <div className="divide-y divide-border/60 border-y border-border/60">
          {questions.map(({ question, answer }, index) => {
            const isOpen = openQuestions.has(question);

            return (
              <div
                key={question}
                id={
                  question === "Is my library private?"
                    ? "faq-privacy"
                    : undefined
                }
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                  onClick={() => toggleQuestion(question)}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 py-5 text-left text-[15px] font-medium tracking-[-0.01em] text-text outline-none transition-colors hover:text-primary focus-visible:text-primary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:py-6 sm:text-base"
                >
                  {question}
                  <MorphIcon
                    icon={isOpen ? Minus : PlusData}
                    aria-hidden="true"
                    size={20}
                    className="shrink-0 text-text-muted"
                    spring="snappy"
                    reducedMotion="user"
                  />
                </button>
                <p
                  id={`faq-answer-${index}`}
                  hidden={!isOpen}
                  className="max-w-2xl pb-5 pr-8 text-sm leading-6 text-text-muted sm:pb-6 sm:text-base sm:leading-7"
                >
                  {answer}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
