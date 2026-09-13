// Simple capability-aware resolver §38 — deterministic preference, isolated for Phase 7 replacement
import type { AITask } from "@/types/ai";
import { VoiceEngineError, VoiceErrorCode } from "@/lib/errors/codes";
import { CATALOG } from "@/lib/ai/models/catalog";
import { isProviderConfigured } from "@/lib/config/server"; // server-side check

export type TaskCapability = "textGeneration" | "speechToText" | "textToSpeech";

const TASK_TO_CAPABILITY: Record<AITask, TaskCapability> = {
  conversation: "textGeneration",
  transcription: "speechToText",
  synthesis: "textToSpeech",
};

// Preference order per spec: Gemini first, Groq second, then browser/mock
const PROVIDER_PREFERENCE = ["gemini", "groq", "browser", "mock"];

export interface ResolvedModel {
  providerId: string;
  modelId: string;
}

export function resolveAutoModel(
  task: AITask,
  opts?: { configuredProviders?: string[] } // for client where server env not available
): ResolvedModel {
  const capability = TASK_TO_CAPABILITY[task];
  const candidates = CATALOG.filter((m) => m.active && (m.capabilities[capability] as boolean));
  // Sort by provider preference
  candidates.sort((a, b) => PROVIDER_PREFERENCE.indexOf(a.providerId) - PROVIDER_PREFERENCE.indexOf(b.providerId));

  // If caller provides configuredProviders (client), filter
  let filtered = candidates;
  if (opts?.configuredProviders) {
    const allowed = new Set(opts.configuredProviders.map((p) => p.toLowerCase()));
    // Browser/mock are always allowed client-side
    filtered = candidates.filter((m) => m.providerId === "browser" || m.providerId === "mock" || allowed.has(m.providerId.toLowerCase()));
  }

  const chosen = filtered[0];
  if (!chosen) {
    throw new VoiceEngineError({ code: VoiceErrorCode.MODEL_NOT_SUPPORTED, message: `No model found for task ${task} capability ${capability}` });
  }
  return { providerId: chosen.providerId, modelId: chosen.id };
}

// Server variant that checks real env keys
export function resolveAutoModelServer(task: AITask, preferredProvider?: string): ResolvedModel {
  const capability = TASK_TO_CAPABILITY[task];
  const candidates = CATALOG.filter((m) => m.active && (m.capabilities[capability] as boolean));
  
  // If specific provider requested, filter candidates for that provider first
  if (preferredProvider && preferredProvider !== "auto") {
    const providerCandidates = candidates.filter((m) => m.providerId === preferredProvider.toLowerCase());
    if (providerCandidates.length > 0) {
      return { providerId: preferredProvider.toLowerCase(), modelId: providerCandidates[0].id };
    }
  }

  candidates.sort((a, b) => PROVIDER_PREFERENCE.indexOf(a.providerId) - PROVIDER_PREFERENCE.indexOf(b.providerId));
  for (const m of candidates) {
    if (m.providerId === "browser" || m.providerId === "mock") continue; // server shouldn't pick browser
    if (isProviderConfigured(m.providerId)) return { providerId: m.providerId, modelId: m.id };
  }
  // If no server provider configured, allow mock if MOCK_AI
  if (process.env.MOCK_AI === "true") {
    const mock = candidates.find((m) => m.providerId === "mock");
    if (mock) return { providerId: mock.providerId, modelId: mock.id };
  }
  throw new VoiceEngineError({ code: VoiceErrorCode.PROVIDER_NOT_CONFIGURED, message: `No configured provider for ${task}`, provider: candidates[0]?.providerId });
}

export function getModelsForCapability(capability: TaskCapability) {
  return CATALOG.filter((m) => m.active && (m.capabilities[capability] as boolean));
}
