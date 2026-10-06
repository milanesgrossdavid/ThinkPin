export type WebSnapshot = {
  id: string;
  bookmarkId: string;
  storagePath: string;
  textContent?: string;
  contentHash?: string;
  capturedAt: string;
};
