export function calculateReadingTimeMinutes(wordCount: number): number {
  if (!Number.isInteger(wordCount) || wordCount < 0) {
    throw new TypeError("Word count must be a non-negative integer.");
  }
  return Math.ceil(wordCount / 200);
}
