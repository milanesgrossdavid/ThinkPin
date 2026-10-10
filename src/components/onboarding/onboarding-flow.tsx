"use client";

import {
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  Globe2,
  Link2,
  Sparkles,
} from "lucide-react";
import { Check as CheckIcon, Plus } from "lucide";
import { MorphIcon } from "morphicons/react";
import { motion, useReducedMotion } from "motion/react";
import { AuthLogo } from "../auth-logo";
import { savePendingBookmark } from "../../lib/bookmarks/pending-bookmark";

const steps = ["Welcome", "Interests", "Import", "First save"] as const;
const interests = [
  "Development",
  "AI",
  "Design",
  "Shopping",
  "Learning",
  "Business",
  "Research",
  "Inspiration",
  "Other",
] as const;

type Interest = (typeof interests)[number];
type BookmarkRecord = {
  url: string;
  domain: string;
  savedAt: string;
};

const interestStorageKey = "thinkpin-user-preferences";
const sampleBookmarks = [
  "https://github.com/vercel/next.js",
  "https://developer.mozilla.org/",
];

function saveInterests(selectedInterests: Interest[], otherInterest: string) {
  window.localStorage.setItem(
    interestStorageKey,
    JSON.stringify({
      interests: selectedInterests.filter((interest) => interest !== "Other"),
      ...(otherInterest.trim() ? { other: otherInterest.trim() } : {}),
    }),
  );
}

function normalizeUrl(value: string) {
  const input = value.trim();
  const url = new URL(
    /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(input) ? input : `https://${input}`,
  );

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Enter a valid web link that starts with http or https.");
  }

  return url;
}

function ProgressIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex flex-col items-end gap-2">
      <p className="text-xs font-medium text-text-muted">
        Getting started <span aria-hidden="true">·</span>{" "}
        <span className="tabular-nums">
          {currentStep + 1}/{steps.length}
        </span>
      </p>
      <ol
        aria-label={`Step ${currentStep + 1} of ${steps.length}`}
        className="flex items-center gap-1.5"
      >
        {steps.map((step, index) => (
          <li key={step}>
            <span
              aria-current={index === currentStep ? "step" : undefined}
              className={`block h-1.5 rounded-full transition-[width,background-color] duration-300 ${
                index <= currentStep ? "w-6 bg-primary" : "w-1.5 bg-border"
              }`}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepHeading({
  id,
  eyebrow,
  title,
  description,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
        {eyebrow}
      </p>
      <h1
        id={id}
        data-page-title
        className="mt-3 text-3xl font-semibold leading-[1.06] tracking-[-0.045em] text-text sm:text-4xl"
      >
        {title}
      </h1>
      <p data-page-summary className="mx-auto mt-3 max-w-lg text-sm leading-6 text-text-muted sm:text-base sm:leading-7">
        {description}
      </p>
    </div>
  );
}

function WelcomeIllustration() {
  const topics = ["Research", "AI", "Design"];

  return (
    <div
      role="img"
      aria-label="A saved article connects to research, AI, and design in your memory"
      data-onboarding-welcome-art
      className="mx-auto mt-8 flex w-full max-w-[340px] flex-col items-center gap-3 sm:mt-9"
    >
      <div className="flex min-h-14 w-full max-w-[260px] items-center gap-3 rounded-2xl border border-border/60 bg-surface-elevated px-4 py-3 shadow-sm">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Bookmark aria-hidden="true" className="size-4" />
        </span>
        <div className="flex items-center gap-2">
          <div>
            <span className="block text-xs font-semibold text-text">
              An article
            </span>
            <span className="mt-1 block text-[10px] text-text-muted">
              Saved for later
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {topics.map((topic) => (
          <span
            key={topic}
            className="rounded-full border border-border/60 bg-surface-elevated px-3 py-1.5 text-[11px] font-medium text-text-muted"
          >
            {topic}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">
        <Sparkles aria-hidden="true" className="size-3.5" />
        Your memory
      </div>
    </div>
  );
}

function InterestOptions({
  selectedInterests,
  onToggle,
}: {
  selectedInterests: Interest[];
  onToggle: (interest: Interest) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Topics you usually save"
      className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3"
    >
      {interests.map((interest) => {
        const selected = selectedInterests.includes(interest);

        return (
          <button
            key={interest}
            type="button"
            aria-pressed={selected}
            onClick={() => onToggle(interest)}
            className={`flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-[background-color,border-color,color,transform] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-h-12 sm:rounded-2xl sm:px-4 sm:py-3 ${
              selected
                ? "border-primary/40 bg-primary/[0.07] text-text"
                : "border-border/60 bg-surface-elevated text-text hover:bg-surface"
            }`}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                  selected ? "bg-primary text-white" : "bg-background text-text-muted"
                }`}
              >
                <MorphIcon
                  icon={selected ? CheckIcon : Plus}
                  size={15}
                  reducedMotion="user"
                  spring="snappy"
                />
              </span>
              <span className="break-words">{interest}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ImportStep() {
  return (
    <div className="mt-7 rounded-2xl border border-border/60 bg-background p-5 text-center sm:p-6">
      <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Bookmark aria-hidden="true" className="size-5" />
      </span>
      <p className="mt-4 text-sm font-semibold text-text">
        Import your browser bookmarks anytime
      </p>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-text-muted">
        HTML bookmark import is available in your library after you sign in.
        Let&apos;s save one link first.
      </p>
      <Link
        href="/login?next=%2Fapp%2Fimport"
        className="mt-4 inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Go to import
      </Link>
    </div>
  );
}

function OnboardingFooter({
  currentStep,
  onBack,
  onContinue,
  onSkip,
  continueLabel,
  skipLabel,
  disabled = false,
}: {
  currentStep: number;
  onBack: () => void;
  onContinue: () => void;
  onSkip?: () => void;
  continueLabel: string;
  skipLabel?: string;
  disabled?: boolean;
}) {
  return (
    <footer className="mt-8 border-t border-border/50 pt-5 sm:mt-9">
      <div className="flex items-center justify-between gap-3">
        {currentStep > 0 ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-text-muted transition-colors hover:bg-background hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back
          </button>
        ) : (
          <span aria-hidden="true" />
        )}

        <button
          type="button"
          onClick={onContinue}
          disabled={disabled}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-[background-color,transform] hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {continueLabel}
          <ArrowRight aria-hidden="true" className="size-4" />
        </button>
      </div>
      {onSkip && skipLabel && (
        <button
          type="button"
          onClick={onSkip}
          className="mx-auto mt-3 flex min-h-10 items-center rounded-full px-4 text-sm font-medium text-text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {skipLabel}
        </button>
      )}
    </footer>
  );
}

export function OnboardingFlow() {
  const bookmarkFormRef = useRef<HTMLFormElement>(null);
  const reduceMotion = useReducedMotion();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedInterests, setSelectedInterests] = useState<Interest[]>([]);
  const [otherInterest, setOtherInterest] = useState("");
  const [bookmarkUrl, setBookmarkUrl] = useState("");
  const [preview, setPreview] = useState<BookmarkRecord | null>(null);
  const [savedBookmark, setSavedBookmark] = useState<BookmarkRecord | null>(null);
  const [message, setMessage] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  function continueFromInterests() {
    try {
      saveInterests(selectedInterests, otherInterest);
      setMessage("");
      setCurrentStep(2);
    } catch {
      setMessage(
        "We couldn't save your interests in this browser. You can continue without saving them.",
      );
      setCurrentStep(2);
    }
  }

  function skipInterests() {
    try {
      saveInterests([], "");
      setMessage("");
    } catch {
      setMessage(
        "We couldn't save your preferences in this browser. Continuing without them.",
      );
    }
    setCurrentStep(2);
  }

  function handleBookmarkPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const url = normalizeUrl(bookmarkUrl);
      setPreview({
        url: url.toString(),
        domain: url.hostname.replace(/^www\./, ""),
        savedAt: new Date().toISOString(),
      });
      setMessage("");
    } catch (error) {
      setPreview(null);
      setMessage(
        error instanceof Error ? error.message : "We couldn't read that link.",
      );
    }
  }

  function handleSaveBookmark() {
    if (!preview) {
      return;
    }

    try {
      const url = savePendingBookmark(window.localStorage, preview.url);
      const parsedUrl = new URL(url);
      setSavedBookmark({
        url,
        domain: parsedUrl.hostname.replace(/^www\./, ""),
        savedAt: new Date().toISOString(),
      });
      setIsComplete(true);
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "We couldn't save this link in this browser. Check storage permissions and try again.",
      );
    }
  }

  function toggleInterest(interest: Interest) {
    setSelectedInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    );
  }

  function moveToStep(step: number) {
    setMessage("");
    setCurrentStep(step);
  }

  const content = isComplete ? (
    <div className="py-2 text-center sm:py-5">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
        <Check aria-hidden="true" className="size-7" />
      </span>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
        Ready for your library
      </p>
      <h1
        id="onboarding-title"
        data-page-title
        className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.045em] text-text sm:text-4xl"
      >
        Your first link is ready.
      </h1>
      <p data-page-summary className="mx-auto mt-3 max-w-md text-sm leading-6 text-text-muted sm:text-base sm:leading-7">
        Sign in to add it to your library. We&apos;ll keep it on this device
        until your account is ready.
      </p>
      {savedBookmark && (
        <div className="mx-auto mt-6 flex max-w-md items-center gap-3 rounded-2xl bg-background p-4 text-left">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Link2 aria-hidden="true" className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-text">
              {savedBookmark.domain}
            </span>
            <span className="mt-1 block truncate text-xs text-text-muted">
              {savedBookmark.url}
            </span>
          </span>
        </div>
      )}
      <div className="mt-7 flex flex-col items-center gap-3">
        <Link
          href="/login?next=%2Fapp"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-[background-color,transform] hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Sign in to save it
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
        <Link
          href="/signup?next=%2Fapp"
          className="min-h-10 rounded-full px-4 py-2 text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Create an account
        </Link>
      </div>
    </div>
  ) : (
    <>
      {currentStep === 0 && (
        <div className="py-1 text-center sm:py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Your Internet, remembered
          </p>
          <h1
            id="onboarding-step-0"
            data-page-title
            className="mt-3 text-3xl font-semibold leading-[1.05] tracking-[-0.05em] text-text sm:text-5xl"
          >
            Welcome to your
            <br />
            Internet Memory.
          </h1>
          <p data-page-summary className="mx-auto mt-3 max-w-md text-sm leading-6 text-text-muted sm:mt-4 sm:text-base sm:leading-7">
            Everything you find online, finally in one place.
          </p>
          <p className="mt-3 text-sm font-medium leading-6 text-text sm:mt-4">
            Save it. <span className="text-border">·</span> Understand it.{" "}
            <span className="text-border">·</span> Find it again.
          </p>
          <WelcomeIllustration />
        </div>
      )}

      {currentStep === 1 && (
        <div>
          <StepHeading
            id="onboarding-step-1"
            eyebrow="Make it yours"
            title="What do you usually save?"
            description="Choose a few topics that matter to you. You can skip this and start saving right away."
          />
          <div className="mt-7">
            <InterestOptions
              selectedInterests={selectedInterests}
              onToggle={toggleInterest}
            />
            {selectedInterests.includes("Other") && (
              <label className="mt-3 block">
                <span className="sr-only">Your other interest</span>
                <input
                  value={otherInterest}
                  onChange={(event) => setOtherInterest(event.target.value)}
                  placeholder="Add your own topic"
                  maxLength={48}
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-text outline-none transition-[border-color,box-shadow] placeholder:text-text-muted/70 focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </label>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-text-muted">
            Optional. Choose as many as you like.
          </p>
        </div>
      )}

      {currentStep === 2 && (
        <div>
          <StepHeading
            id="onboarding-step-2"
            eyebrow="Bring your library"
            title="Import bookmarks when you&apos;re ready."
            description="After sign-in, import an HTML export from your browser. Or skip this step and save a link now."
          />
          <ImportStep />
        </div>
      )}

      {currentStep === 3 && (
        <div>
          <StepHeading
            id="onboarding-step-3"
            eyebrow="Your first memory"
            title="Save something you'll want later."
            description="Paste any link from the Internet. We'll take care of the rest."
          />
          <form
            ref={bookmarkFormRef}
            onSubmit={handleBookmarkPreview}
            className="mt-7"
          >
            <label htmlFor="bookmark-url" className="sr-only">
              Link to save
            </label>
            <div className="flex h-14 items-center gap-3 rounded-2xl border border-border bg-surface-elevated px-4 transition-[border-color,box-shadow] focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
              <Globe2
                aria-hidden="true"
                className="size-[18px] shrink-0 text-text-muted"
              />
              <input
                id="bookmark-url"
                type="url"
                inputMode="url"
                autoComplete="url"
                value={bookmarkUrl}
                onChange={(event) => {
                  setBookmarkUrl(event.target.value);
                  setPreview(null);
                  setMessage("");
                }}
                placeholder="https://"
                required
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted/70"
              />
              <button
                type="submit"
                className="hidden rounded-full px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:inline-flex"
              >
                Preview
              </button>
            </div>
            <button
              type="submit"
              data-primary-action
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-[background-color,transform] hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:hidden"
            >
              Preview link
              <ArrowRight aria-hidden="true" className="size-4" />
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-text-muted">Try an example:</span>
            {sampleBookmarks.map((sample, index) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  setBookmarkUrl(sample);
                  setPreview(null);
                  setMessage("");
                }}
                className="rounded-full bg-background px-3 py-1.5 font-medium text-text transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {index === 0 ? "GitHub repo" : "Developer docs"}
              </button>
            ))}
          </div>

          {preview && (
            <div className="mt-5 rounded-2xl border border-border/60 bg-surface-elevated p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Bookmark aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text">
                    Link ready to save
                  </p>
                  <p className="mt-1 truncate text-xs text-text-muted">
                    {preview.domain}
                  </p>
                </div>
              </div>
              <a
                href={preview.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block truncate text-xs text-primary hover:underline"
              >
                {preview.url}
              </a>
              <p className="mt-3 text-xs leading-5 text-text-muted">
                This preview uses the link only. Page title, description, and
                tags are not fetched yet.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );

  const continueLabel =
    currentStep === 0
      ? "Get started"
      : currentStep === 1
        ? "Continue"
        : "Continue";
  const showFooter = !isComplete;

  return (
    <main data-onboarding-shell className="relative isolate flex min-h-svh flex-col overflow-x-hidden bg-background px-5 py-4 sm:px-8 sm:py-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[min(90vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--primary)_6%,transparent),transparent_68%)]"
      />

      <header className="flex w-full items-center justify-between gap-4">
        <AuthLogo />
        {!isComplete && <ProgressIndicator currentStep={currentStep} />}
      </header>

      <div data-onboarding-stage className="flex flex-1 items-center justify-center py-6 sm:py-8">
        <section
          aria-labelledby={
            isComplete ? "onboarding-title" : `onboarding-step-${currentStep}`
          }
          aria-live="polite"
          data-onboarding-card
          className="w-full max-w-[560px] rounded-[28px] border border-border/50 bg-surface-elevated p-5 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.24)] sm:p-8 lg:p-10"
        >
          <motion.div
            key={`${currentStep}-${isComplete ? "complete" : "step"}`}
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
            }
          >
            {content}
          </motion.div>

          {message && (
            <p
              className="mt-4 rounded-xl bg-background px-3 py-2 text-center text-xs leading-5 text-text-muted"
              role="status"
              aria-live="polite"
            >
              {message}
            </p>
          )}

          {showFooter && (
            <OnboardingFooter
              currentStep={currentStep}
              onBack={() => moveToStep(Math.max(0, currentStep - 1))}
              onContinue={() => {
                if (currentStep === 0) {
                  moveToStep(1);
                } else if (currentStep === 1) {
                  continueFromInterests();
                } else if (currentStep === 2) {
                  moveToStep(3);
                  setPreview(null);
                } else if (preview) {
                  handleSaveBookmark();
                } else {
                  bookmarkFormRef.current?.requestSubmit();
                }
              }}
              onSkip={
                currentStep === 1
                  ? skipInterests
                  : currentStep === 2
                    ? () => moveToStep(3)
                    : undefined
              }
              continueLabel={
                currentStep === 3
                  ? preview
                    ? "Save bookmark"
                    : "Preview link"
                  : continueLabel
              }
              skipLabel={
                currentStep === 1
                  ? "Skip for now"
                  : currentStep === 2
                    ? "I'll do this later"
                    : undefined
              }
              disabled={currentStep === 3 && !preview && !bookmarkUrl.trim()}
            />
          )}
        </section>
      </div>

      <footer className="flex items-center justify-center gap-3 py-1 text-xs text-text-muted">
        <Link
          href="/#faq-privacy"
          className="rounded-sm transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Privacy
        </Link>
        <span aria-hidden="true" className="text-border">
          ·
        </span>
        <span aria-disabled="true" title="Coming soon" className="text-text-muted/70">
          Terms
        </span>
      </footer>
    </main>
  );
}
