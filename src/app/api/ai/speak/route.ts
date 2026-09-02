import { NextResponse } from "next/server";
import { VoiceEngineError, VoiceErrorCode, toUserMessage } from "@/lib/errors/codes";
import { logger } from "@/lib/logger";
import { createProvider } from "@/lib/ai";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "JSON không hợp lệ" } }, { status: 400 });
  }
  const { text, provider = "auto", model = "auto", language = "en-US", voice, speed } = body as {
    text?: string;
    provider?: string;
    model?: string;
    language?: string;
    voice?: string;
    speed?: number;
  };
  if (!text || !text.trim()) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Thiếu text" } }, { status: 400 });

  // Browser TTS is client-side — server just validates and returns mock if requested
  if (provider === "browser" || model === "browser-tts") {
    // Client will handle via speechSynthesis directly; return success stub
    return NextResponse.json({ message: "Use browser TTS client-side", provider: "browser", model: "browser-tts" });
  }

  if (process.env.MOCK_AI === "true" || provider === "mock") {
    const { MockProvider } = await import("@/lib/ai/providers/mock");
    const mock = new MockProvider();
    const result = await mock.synthesizeSpeech({ text, language, voice, speed, model: "mock-tts" });
    // Return audio blob as base64 for JSON transport
    const buf = await result.audio.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");
    return NextResponse.json({ audioBase64: base64, mimeType: result.mimeType, provider: result.provider, model: result.model });
  }

  // Currently no server TTS (Gemini TTS not stable for Phase 1) — instruct client to use browser
  return NextResponse.json(
    { error: { code: VoiceErrorCode.TTS_FAILED, message: "Server TTS chưa cấu hình. Vui lòng dùng Browser TTS." }, hint: "Set provider=browser" },
    { status: 501 }
  );
}
