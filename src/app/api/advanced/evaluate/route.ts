import { NextRequest, NextResponse } from "next/server";
import { evaluateAdvancedAttempt } from "@/lib/advanced/evaluator.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      task,
      userTranscript = "",
      responseLatencyMs = 2200,
      speechDurationMs = 3000,
      hintTierUsed = 0,
      attemptNumber = 1,
      provider,
      model,
      forceAi,
    } = body;

    if (!task) {
      return NextResponse.json({ success: false, error: "Missing task object" }, { status: 400 });
    }

    const evaluation = await evaluateAdvancedAttempt({
      task,
      userTranscript,
      responseLatencyMs,
      speechDurationMs,
      hintTierUsed,
      attemptNumber,
      provider,
      model,
      forceAi,
    });

    return NextResponse.json({ success: true, evaluation });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to evaluate advanced attempt" },
      { status: 500 }
    );
  }
}
