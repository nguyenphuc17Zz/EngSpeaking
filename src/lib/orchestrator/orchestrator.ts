// Central AI Orchestrator §43 — ONE BRAIN, MULTIPLE ENGINES
import type { AITask } from "./task-registry";
import { getTaskPolicy } from "./task-policies";
import { selectModel } from "./router";
import { buildAIContext, estimateTokens } from "./context/engine";
import { getPrompt } from "./prompt-registry";
import { cacheGet, cacheSet, buildCacheKey, getTTL } from "./cache/memory-cache";
import { withRetry, isRetryableError } from "./retry";
import { extractJson, repairPrompt } from "./response-parser";
import { recordTelemetry } from "./telemetry";
import { createProvider } from "@/lib/ai";
import { VoiceEngineError, VoiceErrorCode } from "@/lib/errors/codes";

export interface AIExecutionRequest<TInput = unknown> {
  task: AITask;
  input: TInput;
  mode: "auto" | "manual";
  providerId?: string;
  modelId?: string;
  priority?: "low" | "normal" | "high";
  constraints?: { maxLatencyMs?: number; maxInputTokens?: number; maxOutputTokens?: number };
  responseSchema?: unknown; // Zod schema
  cache?: { enabled?: boolean; ttlMs?: number };
  metadata?: Record<string, unknown>;
}

export interface AIExecutionResponse<T = unknown> {
  output: T;
  providerId: string;
  modelId: string;
  task: AITask;
  latencyMs: number;
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
  cacheHit: boolean;
  requestId: string;
  evaluation?: { promptVersion?: string };
}

export interface AIExecutionBudget {
  maxLatencyMs?: number;
  maxInputTokens?: number;
  maxOutputTokens?: number;
  maxRetries?: number;
}

const pendingRequests = new Map<string, Promise<AIExecutionResponse<unknown>>>();

export class AIOrchestrator {
  async execute<T>(req: AIExecutionRequest): Promise<AIExecutionResponse<T>> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const start = Date.now();
    const policy = getTaskPolicy(req.task);
    const useCache = req.cache?.enabled !== false && policy.cacheStrategy !== "none";

    // 1. Select model §24
    const routing = selectModel(req.task, { providerId: req.providerId, modelId: req.modelId, mode: req.mode });
    const providerId = routing.model.providerId;
    const modelId = routing.model.id;
    const promptMeta = getPrompt(req.task) || { name: req.task, version: "1.0.0", template: "" };

    // 2. Build context §15-19
    const contextData = typeof req.input === "object" && req.input !== null ? req.input as Record<string, unknown> : { input: req.input };
    const packedContext = buildAIContext(req.task, contextData, req.constraints?.maxInputTokens);

    // 3. Cache check §32-33
    const cacheKey = buildCacheKey({ task: req.task, provider: providerId, model: modelId, promptVersion: promptMeta.version, input: packedContext });
    if (useCache) {
      const cached = cacheGet(cacheKey) as T | undefined;
      if (cached !== undefined) {
        const latency = Date.now() - start;
        recordTelemetry({ requestId, task: req.task, providerId, modelId, promptVersion: promptMeta.version, latencyMs: latency, cacheHit: true, retryCount: 0, status: "success", createdAt: new Date().toISOString() });
        return { output: cached, providerId, modelId, task: req.task, latencyMs: latency, cacheHit: true, requestId, evaluation: { promptVersion: promptMeta.version } };
      }
    }

    // Singleflight duplicate protection §61, §14
    if (useCache) {
      const existing = pendingRequests.get(cacheKey);
      if (existing) return existing as Promise<AIExecutionResponse<T>>;
    }
    const executionPromise = (async (): Promise<AIExecutionResponse<T>> => {
      // 4. Build prompt (compose layers §22)
      const userContent = typeof packedContext === "string" ? packedContext : JSON.stringify(packedContext).slice(0, 4000);
      const systemInstruction = `${promptMeta.template || ""}`.trim() || undefined;

      // 5. Execute with retry §35-36
      const maxRetries = req.constraints?.maxLatencyMs ? policy.maxRetries : policy.maxRetries;
      let retryCount = 0;
      let resultText: string | undefined;
      let usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined;

      const execFn = async () => {
        const provider = createProvider(providerId);
        if (!provider) throw new VoiceEngineError({ code: VoiceErrorCode.PROVIDER_NOT_CONFIGURED, message: `Provider ${providerId} not configured`, provider: providerId });
        const res = await provider.generateText({
          messages: [{ role: "user", content: userContent }],
          systemInstruction,
          model: modelId,
          temperature: 0.6,
          maxOutputTokens: req.constraints?.maxOutputTokens || 800,
        });
        resultText = res.text;
        usage = res.usage;
        return res;
      };

      const retryRes = await withRetry(execFn, maxRetries, isRetryableError);
      if ("error" in retryRes) {
        const latency = Date.now() - start;
        recordTelemetry({ requestId, task: req.task, providerId, modelId, promptVersion: promptMeta.version, latencyMs: latency, usage, cacheHit: false, retryCount: retryRes.retryCount, status: "error", errorCode: (retryRes.error as { code?: string })?.code, createdAt: new Date().toISOString() });
        throw retryRes.error;
      }
      retryCount = retryRes.retryCount;
      resultText = retryRes.result.text;
      usage = retryRes.result.usage;

      // 6. Normalize & Validate §39-41
      let output: T;
      if (req.responseSchema) {
        const json = extractJson(resultText || "");
        if (json == null) {
          const repairRes = await withRetry(async () => {
            const provider = createProvider(providerId)!;
            const repair = await provider.generateText({
              messages: [{ role: "user", content: repairPrompt("Invalid JSON", JSON.stringify(req.responseSchema).slice(0, 500)) }],
              systemInstruction: systemInstruction,
              model: modelId,
              temperature: 0.2,
              maxOutputTokens: 500,
            });
            const j = extractJson(repair.text);
            if (!j) throw new Error("Repair failed");
            return j as T;
          }, 1, () => false);
          if ("error" in repairRes) throw new VoiceEngineError({ code: VoiceErrorCode.INVALID_PROVIDER_RESPONSE, message: "Invalid structured output", provider: providerId });
          output = (repairRes as { result: T }).result;
        } else {
          const schema = req.responseSchema as { safeParse?: (v: unknown) => { success: boolean; data?: unknown; error?: unknown } };
          if (schema.safeParse) {
            const parsed = schema.safeParse(json);
            if (!parsed.success) {
              throw new VoiceEngineError({ code: VoiceErrorCode.INVALID_PROVIDER_RESPONSE, message: "Schema validation failed", provider: providerId });
            }
            output = parsed.data as T;
          } else {
            output = json as T;
          }
        }
      } else {
        output = (resultText as unknown) as T;
      }

      const latency = Date.now() - start;
      if (useCache && output !== undefined) {
        cacheSet(cacheKey, output, req.cache?.ttlMs || getTTL(req.task));
      }
      recordTelemetry({ requestId, task: req.task, providerId, modelId, promptVersion: promptMeta.version, latencyMs: latency, usage, cacheHit: false, retryCount, status: "success", createdAt: new Date().toISOString() });

      return { output, providerId, modelId, task: req.task, latencyMs: latency, usage, cacheHit: false, requestId, evaluation: { promptVersion: promptMeta.version } };
    })();

    if (useCache) pendingRequests.set(cacheKey, executionPromise as Promise<AIExecutionResponse<unknown>>);
    try {
      const result = await executionPromise;
      return result;
    } finally {
      if (useCache) pendingRequests.delete(cacheKey);
    }
  }

  // Convenience wrappers §81
  selectModel = selectModel;
  buildContext = buildAIContext;
  estimateTokens = estimateTokens;
}

export const aiOrchestrator = new AIOrchestrator();
