import { NextResponse } from "next/server";
import { VoiceEngineError, VoiceErrorCode, toUserMessage } from "@/lib/errors/codes";
import { logger } from "@/lib/logger";
import { synthesizeEdgeTTS, DEFAULT_EDGE_VOICE } from "@/lib/tts/edge";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const text = url.searchParams.get("text")?.trim();
  const rawProvider = url.searchParams.get("provider") || "edge-tts";
  const rawVoice = url.searchParams.get("voice")?.trim();
  const speedParam = url.searchParams.get("speed");
  const speed = speedParam ? parseFloat(speedParam) : 1.0;

  if (!text) {
    return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Thiếu tham số text" } }, { status: 400 });
  }

  // Determine provider: if voice starts with Kokoro prefix or provider is kokoro
  const isKokoroVoice =
    Boolean(rawVoice && (rawVoice.startsWith("af_") || rawVoice.startsWith("am_") || rawVoice.startsWith("bf_") || rawVoice.startsWith("bm_")));
  const isKokoro = rawProvider === "kokoro-tts" || rawProvider === "kokoro" || (rawProvider === "auto" && isKokoroVoice);

  // Kokoro TTS offline from models/ folder
  if (isKokoro) {
    try {
      const { synthesizeKokoroTTS, DEFAULT_KOKORO_VOICE } = await import("@/lib/tts/kokoro");
      const targetVoice =
        !rawVoice || rawVoice === "auto" || rawVoice === "kokoro-tts"
          ? DEFAULT_KOKORO_VOICE
          : rawVoice;

      const { audioBuffer, mimeType } = await synthesizeKokoroTTS({ text, voice: targetVoice, speed });
      return new Response(new Uint8Array(audioBuffer), {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Length": audioBuffer.length.toString(),
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    } catch (err: unknown) {
      logger.error({ action: "kokoro_tts_get", error: err instanceof Error ? err.message : String(err) });
      return NextResponse.json(
        { error: { code: VoiceErrorCode.TTS_FAILED, message: "Lỗi phát âm qua Kokoro TTS", detail: String(err) } },
        { status: 500 }
      );
    }
  }

  // Default Edge Neural TTS
  try {
    const targetVoice =
      !rawVoice || rawVoice === "auto" || rawVoice === "edge-tts"
        ? DEFAULT_EDGE_VOICE
        : rawVoice;
    const { audioBuffer, mimeType } = await synthesizeEdgeTTS({ text, voice: targetVoice, speed });
    return new Response(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err: unknown) {
    logger.error({ action: "edge_tts_get", error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: { code: VoiceErrorCode.TTS_FAILED, message: "Lỗi phát âm qua Edge TTS", detail: String(err) } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "JSON không hợp lệ" } }, { status: 400 });
  }
  const { text, provider = "edge-tts", model = "auto", language = "en-US", voice, speed } = body as {
    text?: string;
    provider?: string;
    model?: string;
    language?: string;
    voice?: string;
    speed?: number;
  };
  if (!text || !text.trim()) {
    return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Thiếu text" } }, { status: 400 });
  }

  // Browser TTS is client-side — server just validates and returns info if requested
  if (provider === "browser" || model === "browser-tts") {
    return NextResponse.json({ message: "Use browser TTS client-side", provider: "browser", model: "browser-tts" });
  }

  if (process.env.MOCK_AI === "true" || provider === "mock") {
    const { MockProvider } = await import("@/lib/ai/providers/mock");
    const mock = new MockProvider();
    const result = await mock.synthesizeSpeech({ text, language, voice, speed, model: "mock-tts" });
    const buf = await result.audio.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");
    return NextResponse.json({ audioBase64: base64, mimeType: result.mimeType, provider: result.provider, model: result.model });
  }

  const isKokoroVoice = Boolean(
    (voice && (voice.startsWith("af_") || voice.startsWith("am_") || voice.startsWith("bf_") || voice.startsWith("bm_"))) ||
    (model && (model.startsWith("af_") || model.startsWith("am_") || model.startsWith("bf_") || model.startsWith("bm_")))
  );
  const isKokoro = provider === "kokoro-tts" || provider === "kokoro" || (provider === "auto" && isKokoroVoice);

  // Kokoro TTS offline from models/ folder
  if (isKokoro) {
    try {
      const { synthesizeKokoroTTS, DEFAULT_KOKORO_VOICE } = await import("@/lib/tts/kokoro");
      const targetVoice =
        voice && voice !== "auto" && voice !== "kokoro-tts"
          ? voice
          : model && model !== "auto" && model !== "kokoro-tts"
          ? model
          : DEFAULT_KOKORO_VOICE;
      const { audioBuffer, mimeType } = await synthesizeKokoroTTS({
        text,
        voice: targetVoice,
        speed: speed ?? 1.0,
      });

      const base64 = audioBuffer.toString("base64");
      return NextResponse.json({
        audioBase64: base64,
        mimeType,
        provider: "kokoro-tts",
        model: targetVoice,
      });
    } catch (err: unknown) {
      logger.error({ action: "kokoro_tts_post", error: err instanceof Error ? err.message : String(err) });
      return NextResponse.json(
        {
          error: {
            code: VoiceErrorCode.TTS_FAILED,
            message: toUserMessage(new VoiceEngineError({ code: VoiceErrorCode.TTS_FAILED, message: "Lỗi phát âm qua Kokoro TTS", raw: err })),
            detail: err instanceof Error ? err.message : String(err),
          },
          hint: "Fallback to Edge TTS or browser TTS",
        },
        { status: 500 }
      );
    }
  }

  // Default to Edge Neural TTS
  const targetVoice =
    voice && voice !== "auto" && voice !== "edge-tts"
      ? voice
      : model && model !== "auto" && model !== "edge-tts"
      ? model
      : DEFAULT_EDGE_VOICE;

  try {
    const { audioBuffer, mimeType } = await synthesizeEdgeTTS({
      text,
      voice: targetVoice,
      speed: speed ?? 1.0,
    });

    const base64 = audioBuffer.toString("base64");
    return NextResponse.json({
      audioBase64: base64,
      mimeType,
      provider: "edge-tts",
      model: targetVoice,
    });
  } catch (err: unknown) {
    logger.error({ action: "edge_tts_post", error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      {
        error: {
          code: VoiceErrorCode.TTS_FAILED,
          message: toUserMessage(new VoiceEngineError({ code: VoiceErrorCode.TTS_FAILED, message: "Lỗi phát âm qua Edge TTS", raw: err })),
          detail: err instanceof Error ? err.message : String(err),
        },
        hint: "Fallback to browser TTS",
      },
      { status: 500 }
    );
  }
}
