const CHUNK_MAX_CHARACTERS = 4_500;
const CHUNK_OVERLAP_CHARACTERS = 350;

export function chunkContent(input: string): string[] {
  const content = input.replace(/\s+/g, " ").trim();
  if (!content) {
    return [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < content.length) {
    let end = Math.min(start + CHUNK_MAX_CHARACTERS, content.length);
    if (end < content.length) {
      const boundary = content.lastIndexOf(" ", end);
      if (boundary > start + CHUNK_MAX_CHARACTERS / 2) {
        end = boundary;
      }
    }

    const chunk = content.slice(start, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= content.length) {
      break;
    }

    const nextStart = Math.max(end - CHUNK_OVERLAP_CHARACTERS, start + 1);
    const nextBoundary = content.indexOf(" ", nextStart);
    start = nextBoundary === -1 ? nextStart : nextBoundary + 1;
  }

  return chunks;
}
