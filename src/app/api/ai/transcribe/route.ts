import { NextResponse } from "next/server";
import { VoiceEngineError, VoiceErrorCode, toUserMessage } from "@/lib/errors/codes";
import { logger } from "@/lib/logger";
import { createProvider } from "@/lib/ai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const ALLOWED_MIME = ["audio/webm", "audio/wav", "audio/mp3", "audio/mpeg", "audio/mp4", "audio/ogg", "audio/webm;codecs=opus"];
const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // 5MB

function sanitizeLanguage(lang: string): string {
  return lang.slice(0, 10).replace(/[^a-zA-Z0-9-]/g, "");
}

export async function POST(req: Request) {
  // Rate limit: 30/min per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const rl = checkRateLimit(`transcribe:${ip}`, 30);
  if (!rl.allowed) {
    return NextResponse.json({ error: { code: "RATE_LIMITED", message: "Quá nhiều yêu cầu, vui lòng thử lại sau." } }, { status: 429, headers: rateLimitResponse(rl.remaining, rl.resetMs) });
  }
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Yêu cầu FormData với field 'audio'" } }, { status: 400 });
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: { code: "UPLOAD_FAILED", message: "Không thể đọc FormData" } }, { status: 400 });
  }

  const file = form.get("audio") as File | null;
  const provider = (form.get("provider") as string) || "auto";
  const model = (form.get("model") as string) || "auto";
  const language = (form.get("language") as string) || "en-US";

  if (!file) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Thiếu file audio" } }, { status: 400 });

  // Validate audio size & MIME §29-30
  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: { code: "PAYLOAD_TOO_LARGE", message: `Audio quá lớn (tối đa 5MB, bạn gửi ${(file.size / 1024 / 1024).toFixed(1)}MB)` } }, { status: 413 });
  }
  const mimeOk = ALLOWED_MIME.some((m) => file.type.toLowerCase().startsWith(m.split(";")[0]));
  if (file.type && !mimeOk) {
    return NextResponse.json({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: `Định dạng audio không hỗ trợ: ${file.type}` } }, { status: 415 });
  }
  const safeLanguage = sanitizeLanguage(language);

  // Mock mode: strict kill-switch in production §7
  const isMockRequest = provider === "mock" || model === "mock-stt";
  if (isMockRequest && process.env.NODE_ENV === "production" && process.env.MOCK_AI !== "true") {
    return NextResponse.json({ error: { code: "MOCK_DISABLED", message: "Mock không khả dụng trong production" } }, { status: 403 });
  }
  if (process.env.MOCK_AI === "true" || isMockRequest) {
    const { MockProvider } = await import("@/lib/ai/providers/mock");
    const mock = new MockProvider();
    const blob = new Blob([await file.arrayBuffer()], { type: file.type });
    const result = await mock.transcribe({ audio: blob, mimeType: file.type, language: safeLanguage, model: "mock-stt" });
    return NextResponse.json({ result });
  }

  // Browser STT is client-side only — server shouldn't receive browser STT here
  if (provider === "browser") {
    return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Browser STT xử lý ở client, không gửi lên server" } }, { status: 400 });
  }

  // Resolve auto — prefer groq whisper
  let providerId = provider;
  let modelId = model;
  if (providerId === "auto" || modelId === "auto") {
    // Default to groq whisper for server transcription
    providerId = "groq";
    modelId = modelId === "auto" ? "whisper-large-v3-turbo" : modelId;
  }

  const p = createProvider(providerId);
  if (!p) return NextResponse.json({ error: { code: VoiceErrorCode.PROVIDER_NOT_CONFIGURED, message: toUserMessage(new VoiceEngineError({ code: VoiceErrorCode.PROVIDER_NOT_CONFIGURED, message: "", provider: providerId })) } }, { status: 503 });

  try {
    logger.sttStarted({ provider: providerId, model: modelId });
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type || "audio/webm" });
    const result = await p.transcribe({ audio: blob, mimeType: file.type, language: safeLanguage, model: modelId });
    logger.sttCompleted({ provider: result.provider });
    // Validate
    const { transcriptionResultSchema } = await import("@/lib/validation/schemas");
    const parsed = transcriptionResultSchema.safeParse(result);
    if (!parsed.success) throw new VoiceEngineError({ code: VoiceErrorCode.INVALID_PROVIDER_RESPONSE, message: "STT response invalid" });
    return NextResponse.json({ result });
  } catch (e: unknown) {
    logger.error({ error: e instanceof Error ? e.message : String(e) });
    if (e instanceof VoiceEngineError) {
      const status = e.code === VoiceErrorCode.PROVIDER_NOT_CONFIGURED ? 503 : e.code === VoiceErrorCode.STT_FAILED ? 502 : 500;
      return NextResponse.json({ error: { code: e.code, message: toUserMessage(e) } }, { status });
    }
    return NextResponse.json({ error: { code: "STT_FAILED", message: toUserMessage(e) } }, { status: 500 });
  }
}
