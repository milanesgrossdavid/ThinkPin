import { createHash } from "node:crypto";

export function hashNormalizedContent(content: string): string {
  const normalizedContent = content
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .trim()
    .toLowerCase();

  return `sha256:${createHash("sha256").update(normalizedContent, "utf8").digest("hex")}`;
}
