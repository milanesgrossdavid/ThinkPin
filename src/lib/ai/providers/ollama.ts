import {
  AIProviderUnavailableError,
  type AIEmbeddingInput,
  type AIEmbeddingResult,
  type AIProvider,
} from "../types";
import {
  estimateOllamaCostUsd,
  getOllamaRequestConfig,
} from "./ollama-url";

const PROVIDER_ID = "ollama";
const DEFAULT_MODEL = "nomic-embed-text";
const MODEL_DIMENSIONS = 768;
const DATABASE_DIMENSIONS = 1536;

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AIProviderUnavailableError("Ollama returned an invalid response.");
  }
  return value as Record<string, unknown>;
}

export const ollamaProvider: AIProvider = {
  id: PROVIDER_ID,
  async generateEmbedding({ input }: AIEmbeddingInput): Promise<AIEmbeddingResult> {
    const model = process.env.OLLAMA_EMBEDDING_MODEL?.trim() || DEFAULT_MODEL;
    if (input.length === 0) {
      return {
        provider: PROVIDER_ID,
        model,
        dimensions: DATABASE_DIMENSIONS,
        embeddings: [],
        inputTokens: 0,
        estimatedCostUsd: 0,
      };
    }

    const ollama = getOllamaRequestConfig();
    let response: Response;
    try {
      response = await fetch(`${ollama.baseUrl}/api/embed`, {
        method: "POST",
        headers: ollama.headers,
        body: JSON.stringify({ model, input, truncate: true }),
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      throw new AIProviderUnavailableError(
        "Ollama is unavailable. Check the configured local server or Cloud credentials and confirm the embedding model is available.",
      );
    }

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const error = asRecord(payload);
      const details =
        typeof error.error === "string" ? ` ${error.error}` : "";
      throw new AIProviderUnavailableError(
        `Ollama could not create embeddings.${details}`,
      );
    }

    const result = asRecord(payload);
    if (!Array.isArray(result.embeddings) || result.embeddings.length !== input.length) {
      throw new AIProviderUnavailableError(
        "Ollama returned an unexpected number of embeddings.",
      );
    }

    const embeddings = result.embeddings.map((value) => {
      if (
        !Array.isArray(value) ||
        (value.length !== MODEL_DIMENSIONS &&
          value.length !== DATABASE_DIMENSIONS) ||
        !value.every(
          (component) =>
            typeof component === "number" && Number.isFinite(component),
        )
      ) {
        throw new AIProviderUnavailableError(
          "Ollama returned an embedding with an unexpected dimension.",
        );
      }
      return value.length === DATABASE_DIMENSIONS
        ? value
        : [...value, ...Array(DATABASE_DIMENSIONS - MODEL_DIMENSIONS).fill(0)];
    });
    const inputTokens =
      typeof result.prompt_eval_count === "number" &&
      Number.isSafeInteger(result.prompt_eval_count)
        ? result.prompt_eval_count
        : 0;

    return {
      provider: PROVIDER_ID,
      model,
      dimensions: DATABASE_DIMENSIONS,
      embeddings,
      inputTokens,
      estimatedCostUsd: estimateOllamaCostUsd(ollama, inputTokens, 0),
    };
  },
};
