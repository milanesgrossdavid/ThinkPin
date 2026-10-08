import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { load } from "cheerio";
import { Agent, fetch as undiciFetch } from "undici";
import type { Response as UndiciResponse } from "undici";

const FETCH_TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 1_000_000;
const MAX_REDIRECTS = 5;
const USER_AGENT = "ThinkPinMetadataBot/1.0";
const MAX_JSON_BYTES = 100_000;

export type MetadataResult = {
  title: string;
  description: string | null;
  content: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
  canonicalUrl: string | null;
};

type ResolvedAddress = {
  address: string;
  family: number;
};

function isPublicAddress(address: string): boolean {
  const family = isIP(address);

  if (family === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0 && (c === 0 || c === 2)) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 88 && c === 99) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }

  if (family === 6) {
    const [firstHextet, secondHextet] = address.toLowerCase().split(":");
    const first = Number.parseInt(firstHextet, 16);
    const second = Number.parseInt(secondHextet || "0", 16);
    return (
      first >= 0x2000 &&
      first <= 0x3fff &&
      !(first === 0x2001 && (second < 0x0200 || second === 0x0db8)) &&
      first !== 0x2002 &&
      first !== 0x3fff
    );
  }

  return false;
}

async function resolvePublicAddress(hostname: string): Promise<ResolvedAddress> {
  const address = hostname.replace(/^\[|\]$/g, "");
  const family = isIP(address);
  const addresses = family
    ? [{ address, family }]
    : await lookup(address, { all: true, verbatim: true });

  if (addresses.length === 0 || addresses.some(({ address: ip }) => !isPublicAddress(ip))) {
    throw new Error("Host does not resolve exclusively to public IP addresses.");
  }

  return addresses[0];
}

function raceWithAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(signal.reason);
  }

  return new Promise((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

function safeHttpUrl(value: string | null, baseUrl: URL): string | null {
  if (!value?.trim()) {
    return null;
  }

  try {
    const resolved = new URL(value.trim(), baseUrl);
    if (
      (resolved.protocol !== "http:" && resolved.protocol !== "https:") ||
      !resolved.hostname ||
      resolved.username ||
      resolved.password
    ) {
      return null;
    }
    return resolved.toString();
  } catch {
    return null;
  }
}

async function readHtml(response: UndiciResponse): Promise<string> {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_HTML_BYTES) {
    await response.body?.cancel();
    throw new Error("HTML response exceeds the size limit.");
  }

  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      totalBytes += value.byteLength;
      if (totalBytes > MAX_HTML_BYTES) {
        await reader.cancel();
        throw new Error("HTML response exceeds the size limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const html = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    html.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(html);
}

async function fetchHtml(url: URL, signal: AbortSignal): Promise<{ html: string; finalUrl: URL }> {
  let currentUrl = new URL(url);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    if (
      (currentUrl.protocol !== "http:" && currentUrl.protocol !== "https:") ||
      !currentUrl.hostname ||
      currentUrl.username ||
      currentUrl.password
    ) {
      throw new Error("Unsupported URL.");
    }

    const pinnedAddress = await raceWithAbort(
      resolvePublicAddress(currentUrl.hostname),
      signal,
    );
    const dispatcher = new Agent({
      connect: {
        lookup: (_hostname, options, callback) => {
          if (options?.all) {
            callback(null, [pinnedAddress]);
          } else {
            callback(null, pinnedAddress.address, pinnedAddress.family);
          }
        },
      },
      connections: 1,
      connectTimeout: FETCH_TIMEOUT_MS,
      headersTimeout: FETCH_TIMEOUT_MS,
      bodyTimeout: FETCH_TIMEOUT_MS,
      maxResponseSize: MAX_HTML_BYTES,
      pipelining: 0,
    });

    try {
      const response = await undiciFetch(currentUrl, {
        dispatcher,
        redirect: "manual",
        signal,
        headers: {
          accept: "text/html,application/xhtml+xml",
          "accept-encoding": "identity",
          "user-agent": USER_AGENT,
        },
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location || redirectCount === MAX_REDIRECTS) {
          throw new Error("Redirect limit reached or redirect location missing.");
        }
        const nextUrl = safeHttpUrl(location, currentUrl);
        if (!nextUrl) {
          throw new Error("Redirect target is not an HTTP(S) URL.");
        }
        currentUrl = new URL(nextUrl);
        continue;
      }

      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`Metadata request failed with HTTP ${response.status}.`);
      }

      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
        await response.body?.cancel();
        throw new Error("Metadata response is not HTML.");
      }

      return { html: await readHtml(response), finalUrl: currentUrl };
    } finally {
      await dispatcher.close();
    }
  }

  throw new Error("Redirect limit reached.");
}

async function fetchJson(url: URL, signal: AbortSignal): Promise<unknown> {
  const pinnedAddress = await raceWithAbort(
    resolvePublicAddress(url.hostname),
    signal,
  );
  const dispatcher = new Agent({
    connect: {
      lookup: (_hostname, options, callback) => {
        if (options?.all) {
          callback(null, [pinnedAddress]);
        } else {
          callback(null, pinnedAddress.address, pinnedAddress.family);
        }
      },
    },
    connections: 1,
    connectTimeout: FETCH_TIMEOUT_MS,
    headersTimeout: FETCH_TIMEOUT_MS,
    bodyTimeout: FETCH_TIMEOUT_MS,
    maxResponseSize: MAX_JSON_BYTES,
    pipelining: 0,
  });

  try {
    const response = await undiciFetch(url, {
      dispatcher,
      redirect: "error",
      signal,
      headers: {
        accept: "application/json",
        "accept-encoding": "identity",
        "user-agent": USER_AGENT,
      },
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Metadata request failed with HTTP ${response.status}.`);
    }

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BYTES) {
      await response.body?.cancel();
      throw new Error("JSON response exceeds the size limit.");
    }
    const text = await response.text();
    if (Buffer.byteLength(text) > MAX_JSON_BYTES) {
      throw new Error("JSON response exceeds the size limit.");
    }
    return JSON.parse(text) as unknown;
  } finally {
    await dispatcher.close();
  }
}

function firstMetaContent($: ReturnType<typeof load>, attribute: "name" | "property", value: string): string | null {
  const expected = value.toLowerCase();
  const content = $(`meta[${attribute}]`)
    .filter((_, element) => $(element).attr(attribute)?.toLowerCase() === expected)
    .first()
    .attr("content")
    ?.trim();

  return content || null;
}

function firstMetaBySelector(
  $: ReturnType<typeof load>,
  selectors: string[],
): string | null {
  for (const selector of selectors) {
    const content = $(selector).first().attr("content")?.trim();
    if (content) return content;
  }
  return null;
}

function extractResult(html: string, pageUrl: URL, fallbackTitle: string): MetadataResult {
  const $ = load(html);
  const title =
    firstMetaContent($, "property", "og:title") ??
    firstMetaContent($, "name", "twitter:title") ??
    firstMetaContent($, "property", "twitter:title") ??
    $("title").first().text().trim() ??
    fallbackTitle;
  const iconHref = $('link[rel]')
    .filter((_, element) => {
      const rel = $(element).attr("rel")?.toLowerCase().split(/\s+/) ?? [];
      return rel.includes("icon");
    })
    .first()
    .attr("href");
  const canonicalHref = $('link[rel]')
    .filter((_, element) => {
      const rel = $(element).attr("rel")?.toLowerCase().split(/\s+/) ?? [];
      return rel.includes("canonical");
    })
    .first()
    .attr("href");
  const imageHref =
    firstMetaContent($, "property", "og:image") ??
    firstMetaContent($, "property", "og:image:secure_url") ??
    firstMetaContent($, "name", "twitter:image") ??
    firstMetaContent($, "name", "twitter:image:src") ??
    firstMetaContent($, "property", "twitter:image") ??
    firstMetaBySelector($, [
      'meta[itemprop="image"]',
      'link[rel="image_src"]',
    ]);
  $("script, style, noscript, svg, nav, footer, header, form").remove();
  const content = (
    $("article").first().text() ||
    $("main").first().text() ||
    $("body").text()
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80_000);

  return {
    title: title || fallbackTitle,
    description:
      firstMetaContent($, "property", "og:description") ??
      firstMetaContent($, "name", "description"),
    content: content.length >= 100 ? content : null,
    image: safeHttpUrl(imageHref, pageUrl),
    siteName: firstMetaContent($, "property", "og:site_name"),
    favicon:
      safeHttpUrl(iconHref ?? null, pageUrl) ??
      new URL("/favicon.ico", pageUrl).toString(),
    canonicalUrl: safeHttpUrl(canonicalHref ?? null, pageUrl),
  };
}

function youtubeVideoId(url: URL): string | null {
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  if (hostname === "youtu.be") {
    return url.pathname.split("/").filter(Boolean)[0] ?? null;
  }
  if (hostname !== "youtube.com" && hostname !== "m.youtube.com") {
    return null;
  }
  return (
    url.searchParams.get("v") ??
    url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] ??
    null
  );
}

async function enrichYouTubeMetadata(
  metadata: MetadataResult,
  inputUrl: URL,
): Promise<MetadataResult> {
  const videoId = youtubeVideoId(inputUrl);
  if (!videoId) return metadata;

  const fallbackImage = `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
  const fallback: MetadataResult = {
    ...metadata,
    image: metadata.image ?? fallbackImage,
    siteName: "YouTube",
  };

  const endpoint = new URL("https://www.youtube.com/oembed");
  endpoint.searchParams.set("url", inputUrl.toString());
  endpoint.searchParams.set("format", "json");
  try {
    const result = await fetchJson(endpoint, AbortSignal.timeout(FETCH_TIMEOUT_MS));
    if (typeof result !== "object" || result === null) return fallback;
    const embed = result as Record<string, unknown>;
    const title = typeof embed.title === "string" ? embed.title.trim() : "";
    const author =
      typeof embed.author_name === "string" ? embed.author_name.trim() : "";
    const thumbnail =
      typeof embed.thumbnail_url === "string"
        ? safeHttpUrl(embed.thumbnail_url, endpoint)
        : null;

    return {
      ...fallback,
      title: title || fallback.title,
      description: null,
      content: [
        title ? `YouTube video title: ${title}` : "",
        author ? `Video creator: ${author}` : "",
      ]
        .filter(Boolean)
        .join("\n") || fallback.content,
      image: thumbnail ?? fallbackImage,
    };
  } catch (error) {
    console.warn(
      "YouTube oEmbed metadata lookup failed; using the video thumbnail fallback.",
      error instanceof Error ? error.name : "Unknown error",
    );
    return fallback;
  }
}

export async function extractMetadata(input: string | URL): Promise<MetadataResult> {
  let pageUrl: URL;
  try {
    pageUrl = new URL(input);
  } catch {
    const title = typeof input === "string" ? input : input.hostname;
    console.warn("Metadata URL is invalid; returning fallback metadata.");
    return {
      title,
      description: null,
      content: null,
      image: null,
      siteName: null,
      favicon: null,
      canonicalUrl: null,
    };
  }

  const fallbackTitle = pageUrl.hostname.replace(/^\[|\]$/g, "") || pageUrl.toString();
  const fallback: MetadataResult = {
    title: fallbackTitle,
    description: null,
    content: null,
    image: null,
    siteName: null,
    favicon: null,
    canonicalUrl: null,
  };

  if (youtubeVideoId(pageUrl)) {
    return enrichYouTubeMetadata(fallback, pageUrl);
  }

  let metadata = fallback;
  try {
    const { html, finalUrl } = await fetchHtml(
      pageUrl,
      AbortSignal.timeout(FETCH_TIMEOUT_MS),
    );
    metadata = extractResult(html, finalUrl, fallbackTitle);
  } catch (error) {
    console.warn(
      "Metadata extraction failed; returning fallback metadata.",
      error instanceof Error ? error.name : "Unknown error",
    );
  }

  return metadata;
}
