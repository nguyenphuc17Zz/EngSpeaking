// STT service — abstracts client STT (browser) vs server STT (Groq)
import { toUserMessage, VoiceEngineError, VoiceErrorCode } from "@/lib/errors/codes";

export interface STTOptions {
  language?: string;
  provider: string;
  model: string;
}

/**
 * Server STT via /api/ai/transcribe (Groq Whisper)
 * Used when provider !== browser
 */
export async function transcribeViaServer(audio: Blob, opts: STTOptions): Promise<{ text: string; rawText: string; provider: string; model: string }> {
  const form = new FormData();
  form.append("audio", audio, `recording.${audio.type.split("/")[1]?.split(";")[0] || "webm"}`);
  form.append("provider", opts.provider);
  form.append("model", opts.model);
  form.append("language", opts.language || "en-US");
  const res = await fetch("/api/ai/transcribe", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || "STT failed";
    throw new VoiceEngineError({ code: VoiceErrorCode.STT_FAILED, message: msg, provider: opts.provider, model: opts.model });
  }
  const t = data.result?.text ?? "";
  // Preserve distinction raw vs display §16
  return { text: t.trim(), rawText: t, provider: data.result?.provider || opts.provider, model: data.result?.model || opts.model };
}

export function normalizeTranscript(raw: string): string {
  // Faithful to user's speech §16 — no silent rewrite, just trim
  return raw.trim();
}
