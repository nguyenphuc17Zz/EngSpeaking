import { NextRequest, NextResponse } from "next/server";
import { evaluateVNToENAttempt } from "@/lib/foundation/vn-to-en/evaluator.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      task,
      userTranscript = "",
      responseLatencyMs = 2000,
      speechDurationMs = 2800,
      hintTierUsed = 0,
      attemptNumber = 1,
      provider,
      model,
    } = body;

    if (!task) {
      return NextResponse.json({ success: false, error: "Missing task object" }, { status: 400 });
    }

    const evaluation = await evaluateVNToENAttempt({
      task,
      userTranscript,
      responseLatencyMs,
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
        error: error instanceof Error ? error.message : "Failed to evaluate VN to EN attempt",
      },
      { status: 500 }
    );
  }
}
