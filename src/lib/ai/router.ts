import { openAIProvider } from "./providers/openai";
import { ollamaProvider } from "./providers/ollama";
import { ollamaTextProvider } from "./providers/ollama-text";
import {
  AIProviderUnavailableError,
  type AIProvider,
  type AIAnswerProvider,
  type AITextProvider,
  type AITask,
} from "./types";

const embeddingProviders: Record<string, AIProvider> = {
  [openAIProvider.id]: openAIProvider,
  [ollamaProvider.id]: ollamaProvider,
};

const providersByTask: {
  embedding: Record<string, AIProvider>;
  "bookmark-enrichment": Record<string, AITextProvider>;
  answer: Record<string, AIAnswerProvider>;
} = {
  embedding: embeddingProviders,
  "bookmark-enrichment": {
    [ollamaTextProvider.id]: ollamaTextProvider,
  },
  answer: {
    [ollamaTextProvider.id]: ollamaTextProvider,
  },
};

const configuredProviderByTask: Record<AITask, string | undefined> = {
  embedding: process.env.AI_EMBEDDING_PROVIDER,
  "bookmark-enrichment": process.env.AI_BOOKMARK_ENRICHMENT_PROVIDER,
  answer:
    process.env.AI_ANSWER_PROVIDER ||
    process.env.AI_BOOKMARK_ENRICHMENT_PROVIDER,
};

export function getAIProvider(task: "embedding"): AIProvider | null;
export function getAIProvider(task: "bookmark-enrichment"): AITextProvider | null;
export function getAIProvider(task: "answer"): AIAnswerProvider | null;
export function getAIProvider(
  task: AITask,
): AIProvider | AITextProvider | AIAnswerProvider | null {
  const providerId = configuredProviderByTask[task]?.trim() || "disabled";
  if (providerId === "disabled") {
    return null;
  }
  const provider = providersByTask[task]?.[providerId];
  if (!provider) {
    const setting =
      task === "embedding"
        ? "AI_EMBEDDING_PROVIDER"
        : task === "answer"
          ? "AI_ANSWER_PROVIDER"
          : "AI_BOOKMARK_ENRICHMENT_PROVIDER";
    throw new AIProviderUnavailableError(
      `${setting} "${providerId}" is not configured for ${task}.`,
    );
  }
  return provider;
}
