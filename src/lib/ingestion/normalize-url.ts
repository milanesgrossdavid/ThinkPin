const trackingParameters = new Set([
  "fbclid",
  "gclid",
  "utm_campaign",
  "utm_content",
  "utm_medium",
  "utm_source",
  "utm_term",
]);

export function normalizeUrl(input: string | URL): string {
  const normalized = new URL(input);

  if (
    (normalized.protocol !== "http:" && normalized.protocol !== "https:") ||
    !normalized.hostname ||
    normalized.username ||
    normalized.password
  ) {
    throw new TypeError("URL must be an HTTP(S) URL without credentials.");
  }

  normalized.hash = "";

  const functionalParameters = [...normalized.searchParams.entries()].filter(
    ([key]) => !trackingParameters.has(key.toLowerCase()),
  );
  normalized.search = "";
  for (const [key, value] of functionalParameters) {
    normalized.searchParams.append(key, value);
  }

  if (normalized.pathname.length > 1) {
    normalized.pathname = normalized.pathname.replace(/\/+$/, "");
  }

  return normalized.toString();
}
