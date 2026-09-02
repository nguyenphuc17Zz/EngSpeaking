import { NextRequest, NextResponse } from "next/server";
import { evaluateSentenceBuilderAttempt } from "@/lib/foundation/sentence-builder/evaluator.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      task,
      userTranscript = "",
      latencyMs = 2000,
      speechDurationMs = 3000,
      hintTierUsed = 0,
      attemptNumber = 1,
      provider,
      model,
    } = body;

    if (!task) {
      return NextResponse.json({ success: false, error: "Missing task object" }, { status: 400 });
    }

    const evaluation = await evaluateSentenceBuilderAttempt({
      task,
      userTranscript,
      latencyMs,
      speechDurationMs,
      hintTierUsed,
      attemptNumber,
      provider,
      model,
    });

    return NextResponse.json({ success: true, evaluation });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to evaluate attempt",
      },
      { status: 500 }
    );
  }
}
