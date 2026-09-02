import { NextRequest, NextResponse } from "next/server";
import {
  evaluateSingleChunkAttempt,
  evaluateChunkChainAttempt,
} from "@/lib/foundation/chunks/chunk-evaluator.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      mode = "chain_builder",
      task,
      userTranscript = "",
      responseLatencyMs = 2000,
      provider,
      model,
    } = body;

    if (!task) {
      return NextResponse.json({ success: false, error: "Missing task object" }, { status: 400 });
    }

    if (mode === "chain_builder") {
      const evaluation = await evaluateChunkChainAttempt({
        task,
        userTranscript,
        responseLatencyMs,
        provider,
        model,
      });
      return NextResponse.json({ success: true, mode: "chain_builder", evaluation });
    } else {
      const evaluation = await evaluateSingleChunkAttempt({
        task,
        userTranscript,
        responseLatencyMs,
        provider,
        model,
      });
      return NextResponse.json({ success: true, mode: "single_chunk", evaluation });
    }
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to evaluate chunk attempt",
      },
      { status: 500 }
    );
  }
}
