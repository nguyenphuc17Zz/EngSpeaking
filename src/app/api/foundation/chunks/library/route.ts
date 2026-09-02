import { NextRequest, NextResponse } from "next/server";
import { SEED_CHUNK_LIBRARY } from "@/lib/foundation/chunks/chunk-generator.service";

export async function GET() {
  return NextResponse.json({
    success: true,
    library: SEED_CHUNK_LIBRARY,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { canonicalChunk, meaningVi, type = "sentence_frame" } = body;

    if (!canonicalChunk || !meaningVi) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: canonicalChunk, meaningVi" },
        { status: 400 }
      );
    }

    const newChunk = {
      id: `chunk_custom_${Date.now()}`,
      familyKey: canonicalChunk.toLowerCase().replace(/[^a-z0-9]/g, "_"),
      canonicalChunk,
      meaningVi,
      type,
      difficulty: 3,
      functionName: "Custom Learner Chunk",
      variants: [
        {
          id: "v1",
          expression: canonicalChunk,
          register: "neutral",
          exampleSentence: `You can use "${canonicalChunk}" in daily conversation.`,
        },
      ],
      exampleSentences: [`For instance, ${canonicalChunk}`],
      masteryScore: 20,
      retrievalLatencyMs: 3000,
      stage: "exposure",
      practiceCount: 0,
      successCount: 0,
      independentSuccessCount: 0,
      isCustomUserChunk: true,
    };

    return NextResponse.json({ success: true, newChunk });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create custom chunk",
      },
      { status: 500 }
    );
  }
}
