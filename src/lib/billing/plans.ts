export type BillingPlan = "free" | "pro" | "power" | "team";

export type FeatureKey =
  | "ai_organization"
  | "basic_search"
  | "semantic_search"
  | "ai_assistant"
  | "summaries"
  | "research"
  | "decision_boards"
  | "learning"
  | "smart_resurfacing"
  | "web_archive"
  | "link_health"
  | "automation"
  | "youtube_intelligence"
  | "public_collections"
  | "api_access";

export type CreditAction =
  | "bookmark_tagging"
  | "bookmark_summary"
  | "semantic_search"
  | "ai_search"
  | "research_analysis"
  | "report_generation"
  | "learning_path"
  | "learning_explanation";

export type PlanDefinition = {
  label: string;
  monthlyCredits: number;
  stripePriceEnvironmentVariable?: string;
  features: Record<FeatureKey, boolean>;
};

const freeFeatures: Record<FeatureKey, boolean> = {
  ai_organization: true,
  basic_search: true,
  semantic_search: true,
  ai_assistant: false,
  summaries: false,
  research: false,
  decision_boards: false,
  learning: false,
  smart_resurfacing: true,
  web_archive: false,
  link_health: false,
  automation: false,
  youtube_intelligence: false,
  public_collections: false,
  api_access: false,
};

const proFeatures: Record<FeatureKey, boolean> = {
  ...freeFeatures,
  ai_assistant: true,
  summaries: true,
  research: true,
  decision_boards: true,
  learning: true,
  web_archive: true,
  link_health: true,
};

export const planCatalog: Record<BillingPlan, PlanDefinition> = {
  free: {
    label: "Free",
    monthlyCredits: 500,
    features: freeFeatures,
  },
  pro: {
    label: "Pro",
    monthlyCredits: 2_000,
    stripePriceEnvironmentVariable: "STRIPE_PRO_PRICE_ID",
    features: proFeatures,
  },
  power: {
    label: "Power",
    monthlyCredits: 10_000,
    stripePriceEnvironmentVariable: "STRIPE_POWER_PRICE_ID",
    features: {
      ...proFeatures,
    },
  },
  // Retain access for existing Team subscriptions until the plan is retired.
  team: {
    label: "Team",
    monthlyCredits: 2_000,
    stripePriceEnvironmentVariable: "STRIPE_TEAM_PRICE_ID",
    features: proFeatures,
  },
};

export const creditCosts: Record<CreditAction, number> = {
  bookmark_tagging: 1,
  bookmark_summary: 5,
  semantic_search: 1,
  ai_search: 5,
  research_analysis: 30,
  report_generation: 50,
  learning_path: 30,
  learning_explanation: 5,
};

export const featureLabels: Record<FeatureKey, string> = {
  ai_organization: "AI organization",
  basic_search: "Basic search",
  semantic_search: "Semantic search",
  ai_assistant: "AI assistant",
  summaries: "AI summaries",
  research: "Research mode",
  decision_boards: "Decision boards",
  learning: "Learning mode",
  smart_resurfacing: "Smart resurfacing",
  web_archive: "Web archive",
  link_health: "Link health",
  automation: "Automations",
  youtube_intelligence: "YouTube intelligence",
  public_collections: "Public collections",
  api_access: "API access",
};

export function stripePriceForPlan(plan: BillingPlan): string | null {
  const environmentVariable = planCatalog[plan].stripePriceEnvironmentVariable;
  return environmentVariable
    ? process.env[environmentVariable]?.trim() || null
    : null;
}
