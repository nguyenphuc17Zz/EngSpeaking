// Server-side config — never expose keys to client §11, §42
export type SupportedProvider = "gemini" | "groq";

const PROVIDER_ENV_MAP: Record<SupportedProvider, string> = {
  gemini: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
};

export function getProviderApiKey(providerId: string): string | null {
  const key = PROVIDER_ENV_MAP[providerId.toLowerCase() as SupportedProvider];
  if (!key) return null;
  const val = process.env[key];
  if (!val || val.trim() === "") return null;
  return val.trim();
}

export function isProviderConfigured(providerId: string): boolean {
  return !!getProviderApiKey(providerId);
}

export function getProviderConfig(providerId: string): { providerId: string; configured: boolean; maskedKey?: string } {
  const key = getProviderApiKey(providerId);
  const maskedKey = key
    ? `${key.slice(0, 6)}...${key.slice(-4)}`
    : undefined;
  return {
    providerId: providerId.toLowerCase(),
    configured: !!key,
    maskedKey,
  };
}

export function getAllProviderStatuses(): Array<{ providerId: string; configured: boolean; maskedKey?: string }> {
  return (Object.keys(PROVIDER_ENV_MAP) as SupportedProvider[]).map((p) => getProviderConfig(p));
}

/**
 * Update provider API key in runtime process.env
 */
export function setProviderApiKey(providerId: string, apiKey: string): boolean {
  const envVar = PROVIDER_ENV_MAP[providerId.toLowerCase() as SupportedProvider];
  if (!envVar) return false;
  process.env[envVar] = apiKey.trim();
  return true;
}

/**
 * Remove provider API key from runtime process.env
 */
export function removeProviderApiKey(providerId: string): boolean {
  const envVar = PROVIDER_ENV_MAP[providerId.toLowerCase() as SupportedProvider];
  if (!envVar) return false;
  delete process.env[envVar];
  return true;
}

