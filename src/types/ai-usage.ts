export type AIUsageActionType =
  | "bookmark_analysis"
  | "bookmark_summary"
  | "bookmark_tagging"
  | "semantic_search"
  | "ai_search"
  | "ai_answer"
  | "global_search"
  | "research_analysis"
  | "content_extraction"
  | "embedding";

export type AIUsage = {
  id: string;
  userId: string;
  provider: string;
  model: string;
  actionType: AIUsageActionType;
  inputTokens: number;
  outputTokens: number;
  creditsUsed: number;
  providerCredits?: number | null;
  estimatedCostUsd?: number | null;
  requestId?: string;
  createdAt: string;
};
