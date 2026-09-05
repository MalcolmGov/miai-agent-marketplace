/** Presence checks only: partner credentials must also pass a live staging acceptance test. */
export function missingRuntimeConfig(): string[] {
  const missing: string[] = [];
  const has = (key: string) => Boolean(process.env[key]?.trim());
  const auth = process.env.MIAI_AUTH_MODE ?? "mock";
  const wallet = process.env.MIAI_WALLET_MODE ?? "mock";
  const model = process.env.MIAI_MODEL_MODE ?? "mock";
  if (!["mock", "oidc"].includes(auth)) missing.push("MIAI_AUTH_MODE (unsupported)");
  if (!["mock", "http"].includes(wallet)) missing.push("MIAI_WALLET_MODE (unsupported)");
  if (!["mock", "gateway", "http", "azure", "openai", "anthropic", "claude"].includes(model)) {
    missing.push("MIAI_MODEL_MODE (unsupported)");
  }
  if (auth === "oidc" && !has("MIAI_OIDC_ISSUER")) missing.push("MIAI_OIDC_ISSUER");
  if (wallet === "http" && !has("MIAI_WALLET_API_URL")) missing.push("MIAI_WALLET_API_URL");
  if ((model === "gateway" || model === "http") && !has("MIAI_MODEL_GATEWAY_URL")) missing.push("MIAI_MODEL_GATEWAY_URL");
  if (model === "azure") {
    for (const key of ["AZURE_OPENAI_API_KEY", "AZURE_OPENAI_ENDPOINT"]) if (!has(key)) missing.push(key);
  }
  if (model === "openai" && !has("OPENAI_API_KEY")) missing.push("OPENAI_API_KEY");
  if ((model === "anthropic" || model === "claude") && !has("ANTHROPIC_API_KEY")) missing.push("ANTHROPIC_API_KEY");
  if (has("UPSTASH_REDIS_REST_URL") !== has("UPSTASH_REDIS_REST_TOKEN")) {
    missing.push("UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (incomplete pair)");
  }
  return missing;
}
