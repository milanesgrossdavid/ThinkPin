"use client";

import posthog from "posthog-js";

const consentKey = "thinkpin:analytics-consent";
const consentChangedEvent = "thinkpin:analytics-consent-changed";

export type ProductEvent =
  | "signup"
  | "bookmark_saved"
  | "bookmark_opened"
  | "first_bookmark"
  | "search_used"
  | "first_search"
  | "ai_used"
  | "ai_limit_reached"
  | "import_started"
  | "import_completed"
  | "import_failed"
  | "collection_created"
  | "subscription_started"
  | "subscription_cancelled";

export function hasAnalyticsConsent() {
  try {
    return window.localStorage.getItem(consentKey) === "granted";
  } catch {
    return false;
  }
}

export function analyticsConsentChoice(): "granted" | "denied" | null {
  try {
    const choice = window.localStorage.getItem(consentKey);
    return choice === "granted" || choice === "denied" ? choice : null;
  } catch {
    return null;
  }
}

function initializePostHog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || !hasAnalyticsConsent()) return false;

  if (!posthog.__loaded) {
    posthog.init(key, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      opt_out_capturing_by_default: true,
      person_profiles: "identified_only",
      persistence: "localStorage",
    });
  }
  posthog.opt_in_capturing();
  return true;
}

export function setAnalyticsConsent(granted: boolean) {
  try {
    window.localStorage.setItem(consentKey, granted ? "granted" : "denied");
  } catch (error) {
    console.error("Could not save the analytics consent choice.", error);
    return;
  }

  if (granted) {
    initializePostHog();
  } else if (posthog.__loaded) {
    posthog.opt_out_capturing();
    posthog.reset();
    if (hasAnalyticsConsent()) posthog.opt_in_capturing();
  }
  window.dispatchEvent(new Event(consentChangedEvent));
}

export function subscribeToAnalyticsConsent(onChange: () => void) {
  window.addEventListener(consentChangedEvent, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(consentChangedEvent, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function trackProductEvent(
  event: ProductEvent,
  properties: Record<string, string | number | boolean> = {},
) {
  if (initializePostHog()) posthog.capture(event, properties);
}

export function trackProductEventOnce(
  event: ProductEvent,
  key: string,
  properties: Record<string, string | number | boolean> = {},
) {
  if (!initializePostHog()) return;
  const storageKey = `thinkpin:analytics-once:${posthog.get_distinct_id()}:${key}`;
  try {
    if (window.localStorage.getItem(storageKey)) return;
    window.localStorage.setItem(storageKey, "1");
  } catch (error) {
    console.error("Could not persist the one-time analytics event.", error);
    return;
  }
  posthog.capture(event, properties);
}

export function identifyAnalyticsUser(userId: string) {
  if (initializePostHog()) posthog.identify(userId);
}

export function resetAnalyticsUser() {
  if (!posthog.__loaded || !hasAnalyticsConsent()) return;
  posthog.opt_out_capturing();
  posthog.reset();
  posthog.opt_in_capturing();
}

export function trackPageView(pathname: string) {
  if (initializePostHog()) {
    const safePath = pathname.replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?=\/|$)/gi,
      "/:id",
    );
    posthog.capture("$pageview", {
      $current_url: window.location.origin + safePath,
    });
  }
}
