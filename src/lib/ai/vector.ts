export function formatVector(embedding: number[], dimensions: number) {
  if (
    embedding.length !== dimensions ||
    embedding.some((value) => !Number.isFinite(value))
  ) {
    throw new Error("Embedding response has an invalid vector.");
  }
  return `[${embedding.join(",")}]`;
}
