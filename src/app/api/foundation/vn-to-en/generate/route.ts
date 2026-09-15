import { NextRequest, NextResponse } from "next/server";
import { generateVNToENTask } from "@/lib/foundation/vn-to-en/task-generator.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      retrievalMode = "direct",
      category,
      targetDifficulty,
      weakSkills,
      recentErrors,
      recentPrompts,
      pedagogicalConstraint,
      topic,
      provider,
      model,
      forceSource,
    } = body;

    const task = await generateVNToENTask({
      retrievalMode,
      category,
      targetDifficulty,
      weakSkills,
      recentErrors,
      recentPrompts,
      pedagogicalConstraint,
      topic,
      provider,
      model,
      forceSource,
    });

    return NextResponse.json({ success: true, task });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate VN to EN task",
      },
      { status: 500 }
    );
  }
}
