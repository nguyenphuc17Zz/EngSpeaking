import { NextRequest, NextResponse } from "next/server";
import {
  generateCircumlocutionTask,
  generateSurvivalScenarioTask,
} from "@/lib/foundation/survival/survival-generator.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      mode = "circumlocution",
      difficulty,
      targetDifficulty,
      topic,
      prepTimeSec,
      recentPrompts,
      recentErrors,
      pedagogicalConstraint,
      context,
      provider,
      model,
      forceSource,
    } = body;

    if (mode === "circumlocution") {
      const task = await generateCircumlocutionTask({
        difficulty,
        targetDifficulty,
        topic,
        prepTimeSec,
        recentPrompts,
        recentErrors,
        pedagogicalConstraint,
        provider,
        model,
        forceSource,
      });
      return NextResponse.json({ success: true, mode: "circumlocution", task });
    } else {
      const task = await generateSurvivalScenarioTask({
        context,
        targetDifficulty,
        topic,
        prepTimeSec,
        recentPrompts,
        recentErrors,
        pedagogicalConstraint,
        provider,
        model,
        forceSource,
      });
      return NextResponse.json({ success: true, mode: "scenarios", task });
    }
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate survival task",
      },
      { status: 500 }
    );
  }
}
