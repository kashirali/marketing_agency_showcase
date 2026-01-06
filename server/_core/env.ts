import "dotenv/config";

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "demo-app-id",
  // JWT_SECRET is used for cookie signing
  cookieSecret: process.env.JWT_SECRET || process.env.COOKIE_SECRET || "demo-secret-key-for-development",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // OpenRouter or other LLM provider support
  llmApiKey: process.env.OPENROUTER_API_KEY || process.env.BUILT_IN_FORGE_API_KEY || "",
  llmModel: process.env.LLM_MODEL || "google/gemini-2.0-flash-exp:free",
  openRouterBaseUrl: "https://openrouter.ai/api/v1/chat/completions",
};

// Simple validation to ensure critical secrets are set in production
if (ENV.isProduction && ENV.cookieSecret === "demo-secret-key-for-development") {
  console.warn("[ENV] WARNING: Using default COOKIE_SECRET in production is highly insecure!");
}
