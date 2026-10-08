import {
  AIProviderUnavailableError,
  type AIEmbeddingInput,
  type AIEmbeddingResult,
  type AIProvider,
} from "../types";
import { getOllamaBaseUrl } from "./ollama-url";

const PROVIDER_ID = "ollama";
const MODEL = "nomic-embed-text";
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
    if (input.length === 0) {
      return {
        provider: PROVIDER_ID,
        model: MODEL,
        dimensions: DATABASE_DIMENSIONS,
        embeddings: [],
        inputTokens: 0,
      };
    }

    let response: Response;
    try {
      response = await fetch(`${getOllamaBaseUrl()}/api/embed`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: MODEL, input, truncate: true }),
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      throw new AIProviderUnavailableError(
        "Local Ollama is unavailable. Start Ollama and make sure nomic-embed-text is installed.",
      );
    }

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const error = asRecord(payload);
      const details =
        typeof error.error === "string" ? ` ${error.error}` : "";
      throw new AIProviderUnavailableError(
        `Local Ollama could not create embeddings.${details}`,
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
        value.length !== MODEL_DIMENSIONS ||
        !value.every(
          (component) =>
            typeof component === "number" && Number.isFinite(component),
        )
      ) {
        throw new AIProviderUnavailableError(
          "Ollama returned an embedding with an unexpected dimension.",
        );
      }
      return [...value, ...Array(DATABASE_DIMENSIONS - MODEL_DIMENSIONS).fill(0)];
    });
    const inputTokens =
      typeof result.prompt_eval_count === "number" &&
      Number.isSafeInteger(result.prompt_eval_count)
        ? result.prompt_eval_count
        : 0;

    return {
      provider: PROVIDER_ID,
      model: MODEL,
      dimensions: DATABASE_DIMENSIONS,
      embeddings,
      inputTokens,
    };
  },
};
