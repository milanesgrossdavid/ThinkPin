function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getStripePrices() {
  return {
    pro: requiredEnv("STRIPE_PRO_PRICE_ID"),
    power: process.env.STRIPE_POWER_PRICE_ID?.trim() || undefined,
    team: process.env.STRIPE_TEAM_PRICE_ID?.trim() || undefined,
  };
}

export function getAppOrigin() {
  const appUrl = requiredEnv("APP_URL");
  const url = new URL(appUrl);
  if (
    (url.protocol !== "https:" && url.hostname !== "localhost") ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("APP_URL must be a trusted HTTPS origin.");
  }
  return url.origin;
}

export function getStripeConfig() {
  return {
    secretKey: requiredEnv("STRIPE_SECRET_KEY"),
    appOrigin: getAppOrigin(),
    prices: getStripePrices(),
  };
}

export function getStripeWebhookConfig() {
  return {
    secretKey: requiredEnv("STRIPE_SECRET_KEY"),
    webhookSecret: requiredEnv("STRIPE_WEBHOOK_SECRET"),
    supabaseUrl: requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseSecretKey: requiredEnv("SUPABASE_SECRET_KEY"),
    prices: getStripePrices(),
  };
}
