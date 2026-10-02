"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, Check } from "lucide-react";

const useCases = [
  {
    id: "developers",
    label: "Developers",
    intro: "Keep the references that help you ship.",
    save: ["GitHub repositories", "Documentation", "Tutorials", "Tools"],
    next: ["Search", "Connect", "Research", "Build"],
  },
  {
    id: "researchers",
    label: "Researchers",
    intro: "Bring your sources, notes, and ideas together.",
    save: ["Papers", "Studies", "Interviews", "Datasets"],
    next: ["Review", "Connect", "Synthesize", "Discover"],
  },
  {
    id: "creators",
    label: "Creators",
    intro: "Keep inspiration close to the work you make.",
    save: ["Visual references", "Articles", "Videos", "Creative tools"],
    next: ["Collect", "Explore", "Connect", "Create"],
  },
  {
    id: "students",
    label: "Students",
    intro: "Turn everything you learn online into a resource you can find again.",
    save: ["Course materials", "Explainers", "Research", "Study guides"],
    next: ["Save", "Understand", "Review", "Remember"],
  },
  {
    id: "curious-minds",
    label: "Curious minds",
    intro: "Follow your curiosity without losing what you find.",
    save: ["Articles", "Ideas", "Places", "Things to try"],
    next: ["Wander", "Collect", "Connect", "Rediscover"],
  },
];

export function UseCasesSection() {
  const [activeCase, setActiveCase] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selected = useCases[activeCase];

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    let nextIndex = activeCase;

    switch (event.key) {
      case "ArrowRight":
        nextIndex = (activeCase + 1) % useCases.length;
        break;
      case "ArrowLeft":
        nextIndex = (activeCase - 1 + useCases.length) % useCases.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = useCases.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    setActiveCase(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <section
      aria-labelledby="use-cases-title"
      className="bg-surface px-5 py-24 sm:px-8 sm:py-28 lg:py-32"
    >
      <div className="mx-auto max-w-container-xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Made for the way you explore
          </p>
          <h2
            id="use-cases-title"
            className="mt-4 font-heading text-4xl leading-[1.02] tracking-tight text-text sm:text-5xl md:text-6xl"
          >
            A better memory for your kind of curiosity.
          </h2>
        </div>

        <div className="mx-auto mt-9 max-w-4xl sm:mt-12">
          <div
            role="tablist"
            aria-label="Choose how you use the Internet"
            className="grid grid-cols-2 gap-1 rounded-2xl bg-background p-1 sm:flex sm:flex-wrap sm:justify-center sm:rounded-full"
          >
            {useCases.map((useCase, index) => (
              <button
                key={useCase.id}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                id={`use-case-tab-${useCase.id}`}
                type="button"
                role="tab"
                aria-selected={activeCase === index}
                aria-controls="use-case-panel"
                tabIndex={activeCase === index ? 0 : -1}
                onClick={() => setActiveCase(index)}
                onKeyDown={handleTabKeyDown}
                className={`w-full rounded-full px-2 py-2.5 text-[11px] font-medium transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto sm:px-5 sm:text-sm ${
                  activeCase === index
                    ? "bg-surface-elevated text-text shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
                    : "text-text-muted hover:text-text"
                }`}
              >
                {useCase.label}
              </button>
            ))}
          </div>

          <div
            key={selected.id}
            id="use-case-panel"
            role="tabpanel"
            aria-labelledby={`use-case-tab-${selected.id}`}
            tabIndex={0}
            className="mt-5 rounded-[28px] border border-border/50 bg-surface-elevated p-5 shadow-[0_20px_64px_-40px_rgba(0,0,0,0.2)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:mt-6 sm:p-8 lg:p-10"
          >
            <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:gap-12">
              <div>
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <span className="font-mono text-sm font-semibold">
                    0{activeCase + 1}
                  </span>
                </span>
                <h3 className="mt-5 font-heading text-3xl leading-tight text-text sm:text-4xl">
                  For {selected.label.toLowerCase()}.
                </h3>
                <p className="mt-3 max-w-sm text-sm leading-6 text-text-muted sm:text-base sm:leading-7">
                  {selected.intro}
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 sm:gap-8">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-text-muted">
                    Save
                  </h4>
                  <ul className="mt-3 space-y-2.5">
                    {selected.save.map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2.5 text-sm text-text"
                      >
                        <Check
                          aria-hidden="true"
                          className="size-4 shrink-0 text-success"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-text-muted">
                    Then
                  </h4>
                  <ol className="mt-3 flex flex-wrap gap-2">
                    {selected.next.map((step, index) => (
                      <li
                        key={step}
                        className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-xs font-medium text-text"
                      >
                        {step}
                        {index < selected.next.length - 1 && (
                          <ArrowRight
                            aria-hidden="true"
                            className="-mr-1 size-3 text-primary/60"
                          />
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
