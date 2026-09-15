import { NextRequest, NextResponse } from "next/server";
import { generateAdvancedTask } from "@/lib/advanced/task-generator.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      track = "reflex",
      level = "L1",
      skillTag,
      targetDifficulty,
      topic,
      prepTimeSec,
      blitzLimitSec,
      recentErrors,
      recentPrompts,
      targetErrorPatternKey,
      pedagogicalConstraint,
      provider,
      model,
      forceSource,
    } = body;

    const task = await generateAdvancedTask({
      track,
      level,
      skillTag,
      targetDifficulty,
      topic,
      prepTimeSec,
      blitzLimitSec,
      recentErrors,
      recentPrompts,
      targetErrorPatternKey,
      pedagogicalConstraint,
      provider,
      model,
      forceSource,
    });

    return NextResponse.json({ success: true, task });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to generate advanced task" },
      { status: 500 }
    );
  }
}
