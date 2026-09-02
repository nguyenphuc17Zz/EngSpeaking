import { NextResponse } from "next/server";
import { generateExerciseRequestSchema } from "@/lib/validation/foundation-schemas";
import { generateExercise } from "@/lib/foundation/services/exercise-generator.service";
import { toUserMessage, VoiceEngineError } from "@/lib/errors/codes";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "JSON không hợp lệ" } }, { status: 400 }); }
  const parsed = generateExerciseRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Dữ liệu không hợp lệ", details: parsed.error.flatten() } }, { status: 400 });

  const raw = parsed.data as typeof parsed.data & { provider?: string; model?: string; speechBank?: string[] };
  const provider = (raw.provider as string) || "gemini";
  const model = (raw.model as string) || "auto";
  const { skill, type, difficulty, level, mode, topic, previousPerformance, speechBank } = raw;

  try {
    logger.debug("foundation_generate", { skill, type, difficulty });
    const exercise = await generateExercise({ skill, type, difficulty, level: level as unknown as import("@/types/foundation").FoundationLevel, mode, topic, previousPerformance, speechBank }, { provider, model });
    return NextResponse.json({ exercise });
  } catch (e: unknown) {
    logger.error({ error: e instanceof Error ? e.message : String(e) });
    if (e instanceof VoiceEngineError) return NextResponse.json({ error: { code: e.code, message: toUserMessage(e) } }, { status: 500 });
    return NextResponse.json({ error: { code: "EXERCISE_GENERATION_FAILED", message: toUserMessage(e) } }, { status: 500 });
  }
}

// GET for daily plan quick fetch? Use query ?daily=1&mins=10
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("daily") === "1") {
    const mins = parseInt(url.searchParams.get("mins") || "10", 10);
    const provider = url.searchParams.get("provider") || "gemini";
    const model = url.searchParams.get("model") || "auto";
    const { buildDailyPlan } = await import("@/lib/foundation/services/session-engine.service");
    const plan = await buildDailyPlan({ durationMinutes: mins, provider, model });
    return NextResponse.json({ exercises: plan });
  }
  return NextResponse.json({ error: { message: "Use POST to generate" } }, { status: 405 });
}
