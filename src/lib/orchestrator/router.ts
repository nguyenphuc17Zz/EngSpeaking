// Model router §24-28 — deterministic, inspectable
import type { AITask } from "./task-registry";
import { getTaskRequirements } from "./task-registry";
import { getTaskPolicy } from "./task-policies";
import { CATALOG } from "@/lib/ai/models/catalog";
import type { AIModel } from "@/types/ai";
import { filterByCapabilities } from "./model-capability";
import { isProviderConfigured } from "@/lib/config/server";
import { VoiceEngineError, VoiceErrorCode } from "@/lib/errors/codes";

export interface RouterConstraints {
  providerId?: string;
  modelId?: string;
  mode: "auto" | "manual";
}

export interface RoutingDecision {
  model: AIModel;
  reason: string;
  score: number;
  alternatives: AIModel[];
}

export function selectModel(
  task: AITask,
  userConfig: RouterConstraints,
  _constraints?: { maxCost?: string }
): RoutingDecision {
  const req = getTaskRequirements(task);
  const policy = getTaskPolicy(task);

  // 1. Filter by capability §24
  let candidates = filterByCapabilities(CATALOG.filter((m) => m.active), req.requiredCapabilities);
  if (candidates.length === 0) throw new VoiceEngineError({ code: VoiceErrorCode.MODEL_NOT_SUPPORTED, message: `No model supports ${req.requiredCapabilities.join(", ")} for ${task}` });

  // 2. Manual override §26
  if (userConfig.mode === "manual" && userConfig.providerId && userConfig.modelId) {
    const manual = CATALOG.find((m) => m.providerId === userConfig.providerId && m.id === userConfig.modelId);
    if (!manual) throw new VoiceEngineError({ code: VoiceErrorCode.MODEL_NOT_SUPPORTED, message: `Model ${userConfig.modelId} not found` });
    if (!req.requiredCapabilities.every((c) => filterByCapabilities([manual], [c]).length)) {
      throw new VoiceEngineError({ code: VoiceErrorCode.MODEL_NOT_SUPPORTED, message: `Model ${manual.id} cannot perform ${task}` });
    }
    if (!isProviderConfigured(manual.providerId) && manual.providerId !== "browser" && manual.providerId !== "mock") {
      throw new VoiceEngineError({ code: VoiceErrorCode.PROVIDER_NOT_CONFIGURED, message: `Provider ${manual.providerId} not configured`, provider: manual.providerId });
    }
    return { model: manual, reason: `Manual selection ${manual.providerId}/${manual.id}`, score: 100, alternatives: candidates.filter((c) => c.id !== manual.id).slice(0, 2) };
  }

  // 3. Auto: filter by availability §27
  candidates = candidates.filter((m) => {
    if (m.providerId === "browser" || m.providerId === "mock") return true;
    return isProviderConfigured(m.providerId);
  });
  if (candidates.length === 0) throw new VoiceEngineError({ code: VoiceErrorCode.PROVIDER_NOT_CONFIGURED, message: `No configured provider for ${task}` });

  // 4-6: Filter by quality/audio/structured (already via capabilities)

  // 7. Rank §25
  const scored = candidates.map((m) => {
    const qualityMap: Record<string, number> = { free: 1, low: 2, medium: 3, high: 4, unknown: 2 };
    const speedMap: Record<string, number> = { fast: 4, balanced: 2, quality: 1 };
    const qualityScore = qualityMap[m.costClass || "unknown"] || 2; // higher cost often higher quality (simple proxy)
    const latencyScore = speedMap[m.speedClass || "balanced"] || 2;
    const costScore = 4 - (qualityMap[m.costClass || "unknown"] || 2) + 1; // cheaper higher
    const reliabilityScore = m.providerId === "gemini" ? 3 : m.providerId === "groq" ? 3 : 2;
    const score = qualityScore * policy.qualityWeight * 10 + latencyScore * policy.latencyWeight * 10 + costScore * policy.costWeight * 10 + reliabilityScore * policy.reliabilityWeight * 10;
    return { model: m, score };
  });
  scored.sort((a, b) => b.score - a.score);

  // Free-first §78: prefer free-tier compatible
  const freeFirst = scored.find((s) => s.model.costClass === "free");
  const winner = freeFirst && freeFirst.score >= scored[0].score - 5 ? freeFirst : scored[0];

  const reason = `Selected ${winner.model.providerId}/${winner.model.id} — quality ${policy.qualityWeight}, latency ${policy.latencyWeight}, cost ${policy.costWeight} — meets ${req.requiredCapabilities.join(", ")}`;
  return { model: winner.model, reason, score: winner.score, alternatives: scored.slice(0, 3).map((s) => s.model).filter((m) => m.id !== winner.model.id) };
}
