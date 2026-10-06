function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getStripeWebhookConfig() {
  return {
    secretKey: requiredEnv("STRIPE_SECRET_KEY"),
    webhookSecret: requiredEnv("STRIPE_WEBHOOK_SECRET"),
    supabaseUrl: requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseSecretKey: requiredEnv("SUPABASE_SECRET_KEY"),
    prices: {
      pro: requiredEnv("STRIPE_PRO_PRICE_ID"),
      power: process.env.STRIPE_POWER_PRICE_ID?.trim() || undefined,
      team: process.env.STRIPE_TEAM_PRICE_ID?.trim() || undefined,
    },
  };
}
