import { NextRequest, NextResponse } from "next/server";
import { evaluateLatencyAttempt } from "@/lib/foundation/latency/evaluator.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      task,
      userTranscript = "",
      responseLatencyMs = 2000,
      speechDurationMs = 2500,
      provider,
      model,
    } = body;

    if (!task) {
      return NextResponse.json({ success: false, error: "Missing task object" }, { status: 400 });
    }

    const evaluation = await evaluateLatencyAttempt({
      task,
      userTranscript,
      responseLatencyMs,
      speechDurationMs,
      provider,
      model,
    });

    return NextResponse.json({ success: true, evaluation });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to evaluate latency attempt",
      },
      { status: 500 }
    );
  }
}
