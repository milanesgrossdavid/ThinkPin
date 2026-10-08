export type WebSnapshot = {
  id: string;
  bookmarkId: string;
  pageUrl: string;
  pageTitle: string;
  pageDescription: string | null;
  textContent?: string;
  contentHash?: string;
  wordCount: number;
  capturedAt: string;
};

export type WebArchiveCaptureResult =
  | { ok: true; status: "captured" | "unchanged" }
  | { ok: false; error: string };
