import { NextResponse } from "next/server";
import { evaluateRequestSchema } from "@/lib/validation/foundation-schemas";
import { evaluateAttempt } from "@/lib/foundation/services/evaluator.service";
import { toUserMessage, VoiceEngineError } from "@/lib/errors/codes";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "JSON không hợp lệ" } }, { status: 400 }); }
  const parsed = evaluateRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Dữ liệu không hợp lệ", details: parsed.error.flatten() } }, { status: 400 });

  const raw = parsed.data as typeof parsed.data & { provider?: string; model?: string };
  const provider = (raw.provider as string) || "gemini";
  const model = (raw.model as string) || "auto";
  const { exercise, transcript, rawTranscript, durationMs, timeToFirstWordMs, hintsUsed, hintLevel } = raw;

  try {
    const evaluation = await evaluateAttempt(exercise as import("@/types/foundation").FoundationExercise, transcript, rawTranscript, { durationMs, timeToFirstWordMs, hintsUsed, hintLevel, provider, model });
    // Optionally also run AI difficulty assist (§42) but non-blocking — return sync decision, client can call difficulty separately
    return NextResponse.json({ evaluation });
  } catch (e: unknown) {
    logger.error({ error: e instanceof Error ? e.message : String(e) });
    if (e instanceof VoiceEngineError) return NextResponse.json({ error: { code: e.code, message: toUserMessage(e) } }, { status: 500 });
    return NextResponse.json({ error: { code: "EVALUATION_FAILED", message: toUserMessage(e) } }, { status: 500 });
  }
}
