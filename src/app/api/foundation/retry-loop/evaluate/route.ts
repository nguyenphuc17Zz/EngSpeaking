import { NextRequest, NextResponse } from "next/server";
import { evaluateRepairAttempt } from "@/lib/foundation/retry-loop/retry-evaluator.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      targetCorrection,
      userRetryTranscript = "",
      originalTranscript = "",
      expectedSentence = "",
      attemptNumber = 1,
      provider,
      model,
    } = body;

    if (!targetCorrection) {
      return NextResponse.json({ success: false, error: "Missing targetCorrection object" }, { status: 400 });
    }

    const evaluation = await evaluateRepairAttempt({
      targetCorrection,
      userRetryTranscript,
      originalTranscript,
      expectedSentence,
      attemptNumber,
      provider,
      model,
    });

    return NextResponse.json({ success: true, evaluation });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to evaluate retry repair",
      },
      { status: 500 }
    );
  }
}
