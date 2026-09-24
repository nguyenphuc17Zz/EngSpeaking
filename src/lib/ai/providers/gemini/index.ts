// Gemini adapter — primary provider §8, server-side only, never expose key to client
import type { AIProvider } from "@/lib/ai/interfaces/provider";
import { ProviderCapabilityError } from "@/lib/ai/interfaces/provider";
import { VoiceEngineError, VoiceErrorCode, mapProviderErrorToCode } from "@/lib/errors/codes";
import type { AIModel, SpeechSynthesisInput, SpeechSynthesisResult, TextGenerationInput, TextGenerationResult, TranscriptionInput, TranscriptionResult } from "@/types/ai";
import { getModelsForProvider } from "@/lib/ai/models/catalog";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

function cleanModel(model?: string): string {
  const m = (model?.trim() || "gemini-2.5-flash").replace(/^models\//, "");
  return !m || m === "auto" ? "gemini-2.5-flash" : m;
}

function buildPayload(input: TextGenerationInput) {
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  const systemParts: string[] = [];
  if (input.systemInstruction) systemParts.push(input.systemInstruction);
  for (const m of input.messages) {
    if (m.role === "system") systemParts.push(m.content);
    else {
      const role = m.role === "assistant" ? "model" : "user";
      contents.push({ role, parts: [{ text: m.content }] });
    }
  }
  if (contents.length === 0) contents.push({ role: "user", parts: [{ text: "Hello" }] });
  const payload: Record<string, unknown> = { contents };
  if (systemParts.length > 0) {
    payload.systemInstruction = { parts: [{ text: systemParts.join("\n\n") }] };
  }
  const genConfig: Record<string, unknown> = { temperature: input.temperature ?? 0.7 };
  if (input.maxOutputTokens) genConfig.maxOutputTokens = input.maxOutputTokens;
  const modelStr = (input.model || "").toLowerCase();
  if (modelStr.includes("3.6") || modelStr.includes("3.7") || (modelStr.includes("3.5-flash") && !modelStr.includes("lite"))) {
    genConfig.thinkingConfig = { thinkingBudget: 0 };
  }
  payload.generationConfig = genConfig;
  return payload;
}

function extractUsage(data: Record<string, unknown>) {
  const meta = (data.usageMetadata as Record<string, unknown>) || {};
  return {
    inputTokens: meta.promptTokenCount as number | undefined,
    outputTokens: meta.candidatesTokenCount as number | undefined,
    totalTokens: meta.totalTokenCount as number | undefined,
  };
}

export class GeminiProvider implements AIProvider {
  id = "gemini";
  displayName = "Google Gemini";
  private apiKey: string;
  private timeoutMs: number;

  constructor(apiKey: string, timeoutMs = 60_000) {
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  async getModels(): Promise<AIModel[]> {
    if (!this.apiKey) return getModelsForProvider("gemini");
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 10000);
      const url = `${BASE_URL}?key=${encodeURIComponent(this.apiKey)}`;
      const res = await fetch(url, {
        headers: { "x-goog-api-key": this.apiKey },
        signal: controller.signal,
      });
      clearTimeout(t);
      if (!res.ok) return getModelsForProvider("gemini");

      const data = (await res.json()) as {
        models?: Array<{
          name: string;
          displayName?: string;
          description?: string;
          inputTokenLimit?: number;
          outputTokenLimit?: number;
          supportedGenerationMethods?: string[];
        }>;
      };

      const models: AIModel[] = [];
      for (const m of data.models || []) {
        if (!m.supportedGenerationMethods?.includes("generateContent")) continue;
        const mid = (m.name || "").replace(/^models\//, "").trim();
        if (!mid) continue;

        // Skip non-text embedding or vision-only internal models
        if (mid.includes("embedding") || mid.includes("aqa") || mid.includes("imagen")) continue;

        models.push({
          id: mid,
          providerId: "gemini",
          displayName: m.displayName ? `${m.displayName} (${mid})` : mid,
          capabilities: {
            textGeneration: true,
            speechToText: false,
            textToSpeech: false,
            streaming: true,
            structuredOutput: true,
          },
          contextWindow: m.inputTokenLimit || 1_000_000,
          active: true,
        });
      }

      return models.length ? models : getModelsForProvider("gemini");
    } catch {
      return getModelsForProvider("gemini");
    }
  }

  async generateText(input: TextGenerationInput): Promise<TextGenerationResult> {
    if (!this.apiKey)
      throw new VoiceEngineError({
        code: VoiceErrorCode.PROVIDER_NOT_CONFIGURED,
        message: "Gemini API key missing",
        provider: "gemini",
      });

    const initialModel = cleanModel(input.model);
    const candidateModels = [
      initialModel,
      "gemini-2.5-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash-lite",
    ].filter((v, i, a) => a.indexOf(v) === i);

    const payload = buildPayload(input);
    const start = Date.now();
    let lastError: unknown = null;

    for (const model of candidateModels) {
      const url = `${BASE_URL}/${model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          lastError = new VoiceEngineError({
            code: mapProviderErrorToCode(res.status, body),
            message: `Gemini error ${res.status} (${model}): ${body.slice(0, 300)}`,
            provider: "gemini",
            model,
            statusCode: res.status,
          });
          continue;
        }

        const latencyMs = Date.now() - start;
        const data = (await res.json()) as Record<string, unknown>;
        const candidates =
          (data.candidates as Array<{
            content?: { parts?: Array<{ text?: string }> };
            finishReason?: string;
          }>) || [];
        if (!candidates.length) {
          return {
            text: "",
            provider: "gemini",
            model,
            usage: extractUsage(data),
            finishReason: "empty",
            latencyMs,
          };
        }
        const text = candidates[0].content?.parts?.map((p) => p.text || "").join("") || "";
        return {
          text,
          provider: "gemini",
          model,
          usage: extractUsage(data),
          finishReason: candidates[0].finishReason || "stop",
          latencyMs,
        };
      } catch (e: unknown) {
        lastError = e;
        if (e instanceof VoiceEngineError && e.code === VoiceErrorCode.PROVIDER_NOT_CONFIGURED) {
          throw e;
        }
      }
    }

    if (lastError) throw lastError;
    throw new VoiceEngineError({
      code: VoiceErrorCode.AI_GENERATION_FAILED,
      message: "Tất cả các model Gemini đều đang bận hoặc quá tải quota (429/503).",
      provider: "gemini",
    });
  }

  async transcribe(_input: TranscriptionInput): Promise<TranscriptionResult> {
    throw new ProviderCapabilityError("gemini", "speechToText");
  }

  async synthesizeSpeech(_input: SpeechSynthesisInput): Promise<SpeechSynthesisResult> {
    throw new ProviderCapabilityError("gemini", "textToSpeech");
  }

  async healthCheck() {
    if (!this.apiKey)
      return { providerId: "gemini", configured: false, status: "not_configured" as const };
    const start = Date.now();
    try {
      await this.generateText({
        messages: [{ role: "user", content: 'Reply with "OK"' }],
        maxOutputTokens: 5,
        temperature: 0,
      });
      return {
        providerId: "gemini",
        configured: true,
        status: "configured" as const,
        latencyMs: Date.now() - start,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        providerId: "gemini",
        configured: true,
        status: "error" as const,
        errorMessage: msg,
      };
    }
  }
}
