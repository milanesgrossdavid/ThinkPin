import { Plus } from "lucide-react";

const questions = [
  {
    question: "What is this?",
    answer:
      "ThinkPin is a personal memory for the things you find online. Save useful links and ideas, then find and reconnect with them when they matter.",
  },
  {
    question: "What can I save?",
    answer:
      "The goal is to bring your online discoveries together: articles, videos, tools, products, research, GitHub repositories, and ideas.",
  },
  {
    question: "How does AI organize my bookmarks?",
    answer:
      "ThinkPin is designed to use the content and context of saved resources to identify topics and relationships, so your library can help you rediscover them.",
  },
  {
    question: "Can I import my existing bookmarks?",
    answer:
      "Bookmark import options have not been finalized yet. We’ll share supported formats and migration details as the product gets closer to launch.",
  },
  {
    question: "Can I search by meaning?",
    answer:
      "Finding something by the idea or topic you remember is part of the product vision. Search capabilities and availability will be confirmed as development progresses.",
  },
  {
    question: "Is my library private?",
    answer:
      "Privacy is a launch-critical requirement. Before the product goes live, we’ll clearly explain how library data is stored, who can access it, and how any AI processing works.",
  },
  {
    question: "Is there a free plan?",
    answer:
      "Pricing and plan details have not been finalized. We’ll publish them before launch.",
  },
  {
    question: "Can I use it from my browser?",
    answer:
      "ThinkPin is being designed for saving things from across the web. Browser support and extension availability will be shared as they’re confirmed.",
  },
];

export function FAQSection() {
  return (
    <section
      aria-labelledby="faq-title"
      className="bg-background px-5 py-20 sm:px-8 sm:py-28 lg:py-32"
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

        <div className="divide-y divide-border border-y border-border">
          {questions.map(({ question, answer }) => (
            <details
              key={question}
              id={question === "Is my library private?" ? "faq-privacy" : undefined}
              className="group"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-base font-medium text-text outline-none transition-colors hover:text-primary focus-visible:text-primary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:py-6 sm:text-lg [&::-webkit-details-marker]:hidden">
                {question}
                <Plus
                  aria-hidden="true"
                  className="size-5 shrink-0 text-text-muted transition-transform duration-200 group-open:rotate-45 group-open:text-primary"
                />
              </summary>
              <p className="max-w-2xl pb-5 pr-8 text-sm leading-6 text-text-muted sm:pb-6 sm:text-base sm:leading-7">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
