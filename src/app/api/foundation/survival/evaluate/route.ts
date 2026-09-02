import { NextRequest, NextResponse } from "next/server";
import {
  evaluateCircumlocutionAttempt,
  evaluateSurvivalScenarioAttempt,
} from "@/lib/foundation/survival/survival-evaluator.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      mode = "circumlocution",
      task,
      userTranscript = "",
      responseLatencyMs = 2000,
      provider,
      model,
    } = body;

    if (!task) {
      return NextResponse.json({ success: false, error: "Missing task object" }, { status: 400 });
    }

    if (mode === "circumlocution") {
      const evaluation = await evaluateCircumlocutionAttempt({
        task,
        userTranscript,
        responseLatencyMs,
        provider,
        model,
      });
      return NextResponse.json({ success: true, mode: "circumlocution", evaluation });
    } else {
      const evaluation = await evaluateSurvivalScenarioAttempt({
        task,
        userTranscript,
        responseLatencyMs,
        provider,
        model,
      });
      return NextResponse.json({ success: true, mode: "scenarios", evaluation });
    }
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to evaluate survival attempt",
      },
      { status: 500 }
    );
  }
}
