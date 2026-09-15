import { NextRequest, NextResponse } from "next/server";
import { generateLatencyTask } from "@/lib/foundation/latency/task-generator.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      drillMode = "open_response",
      category,
      targetDifficulty,
      targetLatencyMs,
      recentPrompts,
      topic,
      provider,
      model,
      forceSource,
    } = body;

    const task = await generateLatencyTask({
      drillMode,
      category,
      targetDifficulty,
      targetLatencyMs,
      recentPrompts,
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
        error: error instanceof Error ? error.message : "Failed to generate latency task",
      },
      { status: 500 }
    );
  }
}
