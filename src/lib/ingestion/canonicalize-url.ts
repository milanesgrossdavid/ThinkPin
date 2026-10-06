import { normalizeUrl } from "./normalize-url";

export function canonicalizeUrl(
  url: string | URL,
  metadataCanonicalUrl: string | null | undefined,
): string {
  const normalizedUrl = normalizeUrl(url);

  if (!metadataCanonicalUrl?.trim()) {
    return normalizedUrl;
  }

  try {
    const candidate = new URL(metadataCanonicalUrl.trim(), normalizedUrl);
    return normalizeUrl(candidate);
  } catch {
    return normalizedUrl;
  }
}
