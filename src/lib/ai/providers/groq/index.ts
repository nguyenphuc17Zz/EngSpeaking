// Groq adapter — OpenAI-compatible + Whisper STT §9
import type { AIProvider } from "@/lib/ai/interfaces/provider";
import { ProviderCapabilityError } from "@/lib/ai/interfaces/provider";
import { VoiceEngineError, VoiceErrorCode, mapProviderErrorToCode } from "@/lib/errors/codes";
import type { AIModel, SpeechSynthesisInput, SpeechSynthesisResult, TextGenerationInput, TextGenerationResult, TranscriptionInput, TranscriptionResult } from "@/types/ai";
import { getModelsForProvider } from "@/lib/ai/models/catalog";

const CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODELS_URL = "https://api.groq.com/openai/v1/models";
const TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

export class GroqProvider implements AIProvider {
  id = "groq";
  displayName = "Groq";
  private apiKey: string;
  private timeoutMs: number;

  constructor(apiKey: string, timeoutMs = 45_000) {
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  async getModels(): Promise<AIModel[]> {
    if (!this.apiKey) return getModelsForProvider("groq");
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(MODELS_URL, { headers: { Authorization: `Bearer ${this.apiKey}` }, signal: controller.signal });
      clearTimeout(t);
      if (!res.ok) return getModelsForProvider("groq");
      const data = (await res.json()) as { data?: Array<{ id: string; active?: boolean; context_window?: number }> };
      const models: AIModel[] = [];
      for (const m of data.data || []) {
        if (m.active === false) continue;
        const mid = (m.id || "").trim();
        if (!mid) continue;
        const lower = mid.toLowerCase();
        const caps: AIModel["capabilities"] = lower.includes("whisper")
          ? { textGeneration: false, speechToText: true, textToSpeech: false, streaming: false, structuredOutput: false }
          : { textGeneration: true, speechToText: false, textToSpeech: false, streaming: true, structuredOutput: true };
        models.push({
          id: mid,
          providerId: "groq",
          displayName: mid,
          capabilities: caps,
          contextWindow: m.context_window || 128_000,
          active: true,
        });
      }
      return models.length ? models : getModelsForProvider("groq");
    } catch {
      return getModelsForProvider("groq");
    }
  }

  async generateText(input: TextGenerationInput): Promise<TextGenerationResult> {
    if (!this.apiKey) throw new VoiceEngineError({ code: VoiceErrorCode.PROVIDER_NOT_CONFIGURED, message: "Groq API key missing", provider: "groq" });
    const rawModel = input.model?.trim();
    const model = (!rawModel || rawModel === "auto") ? "openai/gpt-oss-120b" : rawModel;
    const messages: Array<{ role: string; content: string }> = [];
    if (input.systemInstruction) messages.push({ role: "system", content: input.systemInstruction });
    for (const m of input.messages) messages.push({ role: m.role, content: m.content });
    if (!messages.length) messages.push({ role: "user", content: "Hello" });
    const isReasoningModel = model.includes("gpt-oss") || model.includes("deepseek-r1");
    let maxTokens = input.maxOutputTokens || 600;
    if (isReasoningModel && maxTokens < 3500) {
      // Groq reasoning models (e.g. openai/gpt-oss-120b) generate 500-1100 reasoning tokens internally,
      // which count against max_tokens. Ensure at least 3500 tokens headroom so output is not cut off.
      maxTokens = 3500;
    }
    const payload: Record<string, unknown> = {
      model,
      messages,
      temperature: input.temperature ?? 0.7,
      stream: false,
      max_tokens: maxTokens,
      max_completion_tokens: maxTokens,
    };
    const start = Date.now();
    let res: Response;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      res = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes("abort")) throw new VoiceEngineError({ code: VoiceErrorCode.TIMEOUT, message: `Groq timeout`, provider: "groq" });
      throw new VoiceEngineError({ code: VoiceErrorCode.NETWORK_ERROR, message: msg, provider: "groq" });
    }
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const code = mapProviderErrorToCode(res.status, body);
      throw new VoiceEngineError({ code, message: `Groq error ${res.status}: ${body.slice(0, 500)}`, provider: "groq", model, statusCode: res.status });
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string }; finish_reason?: string }>; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } };
    const text = data.choices?.[0]?.message?.content || "";
    const usage = data.usage ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens, totalTokens: data.usage.total_tokens } : undefined;
    return { text, provider: "groq", model, usage, finishReason: data.choices?.[0]?.finish_reason || "stop", latencyMs };
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    if (!this.apiKey) throw new VoiceEngineError({ code: VoiceErrorCode.PROVIDER_NOT_CONFIGURED, message: "Groq API key missing", provider: "groq" });
    const model = input.model?.trim() || "whisper-large-v3-turbo";
    // Build FormData for Whisper
    const form = new FormData();
    let blob: Blob;
    if (input.audio instanceof Blob) blob = input.audio;
    else if (input.audio instanceof Uint8Array) blob = new Blob([input.audio as BlobPart], { type: input.mimeType || "audio/webm" });
    else if (input.audio instanceof ArrayBuffer) blob = new Blob([input.audio], { type: input.mimeType || "audio/webm" });
    else blob = input.audio as unknown as Blob;
    form.append("file", blob, `audio.${(input.mimeType || "audio/webm").split("/")[1]?.split(";")[0] || "webm"}`);
    form.append("model", model);
    if (input.language) form.append("language", input.language.replace("-", "-").toLowerCase().split("-")[0]); // en
    form.append("response_format", "verbose_json");
    let res: Response;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      res = await fetch(TRANSCRIBE_URL, { method: "POST", headers: { Authorization: `Bearer ${this.apiKey}` }, body: form, signal: controller.signal });
      clearTimeout(timer);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new VoiceEngineError({ code: VoiceErrorCode.NETWORK_ERROR, message: msg, provider: "groq", model });
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const code = mapProviderErrorToCode(res.status, body);
      throw new VoiceEngineError({ code: code === VoiceErrorCode.UNKNOWN ? VoiceErrorCode.STT_FAILED : code, message: `Groq STT error ${res.status}: ${body.slice(0, 500)}`, provider: "groq", model, statusCode: res.status });
    }
    const data = (await res.json()) as { text?: string; language?: string; duration?: number; segments?: Array<{ text: string; start: number; end: number }> };
    return {
      text: (data.text || "").trim(),
      language: data.language,
      durationMs: data.duration ? Math.round(data.duration * 1000) : undefined,
      segments: data.segments?.map((s) => ({ text: s.text, startMs: Math.round(s.start * 1000), endMs: Math.round(s.end * 1000) })),
      provider: "groq",
      model,
    };
  }

  async synthesizeSpeech(_input: SpeechSynthesisInput): Promise<SpeechSynthesisResult> {
    throw new ProviderCapabilityError("groq", "textToSpeech");
  }

  async healthCheck() {
    if (!this.apiKey) return { providerId: "groq", configured: false, status: "not_configured" as const };
    const start = Date.now();
    try {
      await this.generateText({ messages: [{ role: "user", content: 'Reply with "OK"' }], maxOutputTokens: 5, temperature: 0 });
      return { providerId: "groq", configured: true, status: "configured" as const, latencyMs: Date.now() - start };
    } catch (e: unknown) {
      return { providerId: "groq", configured: true, status: "error" as const, errorMessage: e instanceof Error ? e.message : String(e) };
    }
  }
}
