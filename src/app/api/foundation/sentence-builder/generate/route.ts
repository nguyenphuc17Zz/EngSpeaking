import { NextRequest, NextResponse } from "next/server";
import { generateSentenceBuilderTask } from "@/lib/foundation/sentence-builder/task-generator.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      controlLevel = "controlled",
      taskType,
      targetDifficulty,
      weakSkills,
      recentErrors,
      recentPrompts,
      targetErrorPatternKey,
      topic,
      prepTimeSec,
      provider,
      model,
    } = body;

    const task = await generateSentenceBuilderTask({
      controlLevel,
      taskType,
      targetDifficulty,
      weakSkills,
      recentErrors,
      recentPrompts,
      targetErrorPatternKey,
      topic,
      prepTimeSec,
      provider,
      model,
    });

    return NextResponse.json({ success: true, task });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate task",
      },
      { status: 500 }
    );
  }
}
