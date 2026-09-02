import { NextRequest, NextResponse } from "next/server";
import {
  generateCircumlocutionTask,
  generateSurvivalScenarioTask,
} from "@/lib/foundation/survival/survival-generator.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode = "circumlocution", difficulty, context, provider, model } = body;

    if (mode === "circumlocution") {
      const task = await generateCircumlocutionTask({ difficulty, provider, model });
      return NextResponse.json({ success: true, mode: "circumlocution", task });
    } else {
      const task = await generateSurvivalScenarioTask({ context, provider, model });
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
