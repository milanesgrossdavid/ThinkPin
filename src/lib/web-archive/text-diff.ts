export type TextChange =
  | { type: "added"; text: string }
  | { type: "removed"; text: string }
  | { type: "changed"; before: string; after: string };

export type TextDiffResult = {
  added: TextChange[];
  removed: TextChange[];
  changed: TextChange[];
  hasChanges: boolean;
};

const MAX_SEGMENTS = 1200;

function splitReadableText(value: string): string[] {
  return value
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .split(/\n+|(?<=[.!?])\s+/u)
    .map((part) => part.replace(/\s+/gu, " ").trim())
    .filter(Boolean);
}

function tokenSet(value: string): Set<string> {
  return new Set(
    (value.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(
      (token) => token.length > 2,
    ),
  );
}

function similarity(first: string, second: string): number {
  const firstTokens = tokenSet(first);
  const secondTokens = tokenSet(second);
  if (!firstTokens.size || !secondTokens.size) return 0;
  let intersection = 0;
  for (const token of firstTokens) {
    if (secondTokens.has(token)) intersection += 1;
  }
  return intersection / (firstTokens.size + secondTokens.size - intersection);
}

export function diffReadableText(before: string, after: string): TextDiffResult {
  const oldSegments = splitReadableText(before);
  const newSegments = splitReadableText(after);
  if (oldSegments.length > MAX_SEGMENTS || newSegments.length > MAX_SEGMENTS) {
    throw new RangeError(
      `A snapshot exceeds the ${MAX_SEGMENTS}-segment comparison limit.`,
    );
  }
  const columns = newSegments.length + 1;
  const table = new Uint16Array((oldSegments.length + 1) * columns);

  for (let oldIndex = oldSegments.length - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = newSegments.length - 1; newIndex >= 0; newIndex -= 1) {
      const index = oldIndex * columns + newIndex;
      table[index] =
        oldSegments[oldIndex] === newSegments[newIndex]
          ? table[(oldIndex + 1) * columns + newIndex + 1] + 1
          : Math.max(
              table[(oldIndex + 1) * columns + newIndex],
              table[oldIndex * columns + newIndex + 1],
            );
    }
  }

  const removed: string[] = [];
  const added: string[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  while (oldIndex < oldSegments.length && newIndex < newSegments.length) {
    if (oldSegments[oldIndex] === newSegments[newIndex]) {
      oldIndex += 1;
      newIndex += 1;
    } else if (
      table[oldIndex * columns + newIndex + 1] >=
      table[(oldIndex + 1) * columns + newIndex]
    ) {
      added.push(newSegments[newIndex]);
      newIndex += 1;
    } else {
      removed.push(oldSegments[oldIndex]);
      oldIndex += 1;
    }
  }
  while (oldIndex < oldSegments.length) {
    removed.push(oldSegments[oldIndex]);
    oldIndex += 1;
  }
  while (newIndex < newSegments.length) {
    added.push(newSegments[newIndex]);
    newIndex += 1;
  }

  const pairedAdded = new Set<number>();
  const changed: TextChange[] = [];
  const stillRemoved: string[] = [];
  for (const oldText of removed) {
    let bestIndex = -1;
    let bestSimilarity = 0.35;
    for (let index = 0; index < added.length; index += 1) {
      if (pairedAdded.has(index)) continue;
      const score = similarity(oldText, added[index]);
      if (score > bestSimilarity) {
        bestSimilarity = score;
        bestIndex = index;
      }
    }
    if (bestIndex === -1) {
      stillRemoved.push(oldText);
    } else {
      pairedAdded.add(bestIndex);
      changed.push({
        type: "changed",
        before: oldText,
        after: added[bestIndex],
      });
    }
  }

  const stillAdded = added.filter((_, index) => !pairedAdded.has(index));
  return {
    added: stillAdded.map((text) => ({ type: "added", text })),
    removed: stillRemoved.map((text) => ({ type: "removed", text })),
    changed,
    hasChanges: stillAdded.length > 0 || stillRemoved.length > 0 || changed.length > 0,
  };
}
