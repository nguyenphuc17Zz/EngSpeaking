// Server-side config — never expose keys to client §11, §42
import fs from "fs";
import path from "path";

export type SupportedProvider = "gemini" | "groq";

const PROVIDER_ENV_MAP: Record<SupportedProvider, string> = {
  gemini: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
};

const KEYLESS_SERVER_PROVIDERS = new Set([
  "edge-tts",
  "edge",
  "kokoro-tts",
  "kokoro",
  "whisper-local",
  "whisper-onnx",
  "whisper",
]);

const API_KEYS_FILE = path.join(process.cwd(), "data", "api-keys.json");

function readPersistedKeys(): Record<string, string> {
  try {
    if (!fs.existsSync(API_KEYS_FILE)) return {};
    const raw = fs.readFileSync(API_KEYS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function persistKeyToStorage(envVar: string, keyVal?: string): void {
  try {
    const dir = path.dirname(API_KEYS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const current = readPersistedKeys();
    if (keyVal) {
      current[envVar] = keyVal.replace(/[\r\n]/g, "").trim();
    } else {
      delete current[envVar];
    }
    fs.writeFileSync(API_KEYS_FILE, JSON.stringify(current, null, 2), "utf-8");
  } catch {}
}

export function getProviderApiKey(providerId: string): string | null {
  const key = PROVIDER_ENV_MAP[providerId.toLowerCase() as SupportedProvider];
  if (!key) return null;
  const val = process.env[key];
  if (val && val.trim() !== "") return val.trim();

  const persisted = readPersistedKeys()[key];
  if (persisted && persisted.trim() !== "") {
    const clean = persisted.replace(/[\r\n]/g, "").trim();
    process.env[key] = clean;
    return clean;
  }
  return null;
}

export function isProviderConfigured(providerId: string): boolean {
  const lower = providerId.toLowerCase();
  if (KEYLESS_SERVER_PROVIDERS.has(lower)) return true;
  return !!getProviderApiKey(lower);
}

export function getProviderConfig(providerId: string): { providerId: string; configured: boolean; maskedKey?: string } {
  const key = getProviderApiKey(providerId);
  const maskedKey = key
    ? `${key.slice(0, 6)}...${key.slice(-4)}`
    : undefined;
  return {
    providerId: providerId.toLowerCase(),
    configured: isProviderConfigured(providerId),
    maskedKey,
  };
}

export function getAllProviderStatuses(): Array<{ providerId: string; configured: boolean; maskedKey?: string }> {
  return (Object.keys(PROVIDER_ENV_MAP) as SupportedProvider[]).map((p) => getProviderConfig(p));
}

/**
 * Update provider API key in runtime process.env and persist to data/api-keys.json
 */
export function setProviderApiKey(providerId: string, apiKey: string): boolean {
  const envVar = PROVIDER_ENV_MAP[providerId.toLowerCase() as SupportedProvider];
  if (!envVar) return false;
  const clean = apiKey.replace(/[\r\n]/g, "").trim();
  process.env[envVar] = clean;
  persistKeyToStorage(envVar, clean);
  return true;
}

/**
 * Remove provider API key from runtime process.env and data/api-keys.json
 */
export function removeProviderApiKey(providerId: string): boolean {
  const envVar = PROVIDER_ENV_MAP[providerId.toLowerCase() as SupportedProvider];
  if (!envVar) return false;
  delete process.env[envVar];
  persistKeyToStorage(envVar, undefined);
  return true;
}

