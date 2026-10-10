"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  analyticsConsentChoice,
  setAnalyticsConsent,
  subscribeToAnalyticsConsent,
  trackProductEvent,
  trackProductEventOnce,
  trackPageView,
} from "../lib/analytics";
import { bookmarkSavedEvent } from "../lib/bookmarks";

export function PrivacyAnalyticsConsent() {
  const pathname = usePathname();
  const [choice, setChoice] = useState<"granted" | "denied" | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const configured = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

  useEffect(() => {
    const syncChoice = () => setChoice(analyticsConsentChoice());
    syncChoice();
    return subscribeToAnalyticsConsent(syncChoice);
  }, []);

  useEffect(() => {
    function onBookmarkSaved() {
      trackProductEvent("bookmark_saved");
      trackProductEventOnce("first_bookmark", "first-bookmark");
    }
    window.addEventListener(bookmarkSavedEvent, onBookmarkSaved);
    return () => window.removeEventListener(bookmarkSavedEvent, onBookmarkSaved);
  }, []);

  useEffect(() => {
    if (choice === "granted") trackPageView(pathname);
  }, [choice, pathname]);

  if (!configured) return null;

  if (choice === null || settingsOpen) {
    return (
      <aside
        aria-label="Analytics privacy settings"
        className="fixed inset-x-4 bottom-4 z-[120] mx-auto max-w-xl rounded-2xl border border-border bg-surface-elevated p-4 shadow-xl sm:inset-x-auto sm:right-6 sm:bottom-6"
      >
        <p className="text-sm font-semibold text-text">Your privacy choices</p>
        <p className="mt-1 text-xs leading-5 text-text-muted">
          With your permission, we collect product usage events linked to an
          internal account ID to improve ThinkPin. We never send saved links,
          search terms, notes, email addresses, or passwords to analytics.
        </p>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setAnalyticsConsent(false);
              setSettingsOpen(false);
            }}
            className="min-h-9 rounded-full border border-border px-4 text-xs font-medium text-text hover:bg-background"
          >
            {choice === "denied" ? "Keep analytics off" : "Reject analytics"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAnalyticsConsent(true);
              setSettingsOpen(false);
            }}
            className="min-h-9 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Allow analytics
          </button>
        </div>
      </aside>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setSettingsOpen(true)}
      className="fixed bottom-3 left-3 z-[110] rounded-full border border-border bg-surface-elevated/90 px-3 py-2 text-[11px] font-medium text-text-muted shadow-sm backdrop-blur hover:text-text"
    >
      Privacy settings
    </button>
  );
}
