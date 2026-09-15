import { NextRequest, NextResponse } from "next/server";
import {
  generateChunkChainTask,
  generateSingleChunkTask,
} from "@/lib/foundation/chunks/chunk-generator.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode = "chain_builder", topic, strategy, domain, chunk, stage, provider, model, forceSource } = body;

    if (mode === "chain_builder") {
      const task = await generateChunkChainTask({ topic, strategy, domain, provider, model, forceSource });
      return NextResponse.json({ success: true, mode: "chain_builder", task });
    } else {
      const task = await generateSingleChunkTask({ chunk, stage, provider, model });
      return NextResponse.json({ success: true, mode: "single_chunk", task });
    }
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate chunk task",
      },
      { status: 500 }
    );
  }
}
