import OpenAI from "openai";
import type {
  AIEmbeddingInput,
  AIEmbeddingResult,
  AIProvider,
} from "../types";

const MODEL = "text-embedding-3-small";
const DIMENSIONS = 1536;
const PROVIDER_ID = "openai";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for the OpenAI AI provider.");
  }
  return new OpenAI({ apiKey });
}

export const openAIProvider: AIProvider = {
  id: PROVIDER_ID,
  async generateEmbedding({ input }: AIEmbeddingInput): Promise<AIEmbeddingResult> {
    if (input.length === 0) {
      return {
        provider: PROVIDER_ID,
        model: MODEL,
        dimensions: DIMENSIONS,
        embeddings: [],
        inputTokens: 0,
      };
    }

    const response = await getOpenAIClient().embeddings.create({
      model: MODEL,
      input,
      dimensions: DIMENSIONS,
      encoding_format: "float",
    });

    const embeddings = response.data
      .sort((first, second) => first.index - second.index)
      .map(({ embedding }) => embedding);
    if (
      embeddings.some(
        (embedding) =>
          embedding.length !== DIMENSIONS ||
          embedding.some((value) => !Number.isFinite(value)),
      )
    ) {
      throw new Error("OpenAI returned an invalid embedding vector.");
    }

    return {
      provider: PROVIDER_ID,
      model: MODEL,
      dimensions: DIMENSIONS,
      embeddings,
      inputTokens: response.usage.prompt_tokens,
      requestId: response._request_id ?? undefined,
    };
  },
};
