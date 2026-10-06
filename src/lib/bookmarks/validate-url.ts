const MAX_URL_LENGTH = 2048;

export type ValidatedBookmarkUrl = {
  originalUrl: string;
  normalizedUrl: string;
  domain: string;
};

export class InvalidBookmarkUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidBookmarkUrlError";
  }
}

export function validateBookmarkUrl(input: unknown): ValidatedBookmarkUrl {
  if (typeof input !== "string") {
    throw new InvalidBookmarkUrlError("URL must be a string.");
  }

  const originalUrl = input.trim();
  if (!originalUrl || originalUrl.length > MAX_URL_LENGTH) {
    throw new InvalidBookmarkUrlError("URL is required and must be 2048 characters or fewer.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(originalUrl);
  } catch {
    throw new InvalidBookmarkUrlError("Enter a valid absolute URL.");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new InvalidBookmarkUrlError("Only HTTP and HTTPS URLs are allowed.");
  }

  if (!parsedUrl.hostname || parsedUrl.username || parsedUrl.password) {
    throw new InvalidBookmarkUrlError("URL must have a hostname and cannot contain credentials.");
  }

  return {
    originalUrl,
    normalizedUrl: parsedUrl.toString(),
    domain: parsedUrl.hostname,
  };
}
