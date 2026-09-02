import { NextRequest, NextResponse } from "next/server";
import { generateDeterministicEnhancement } from "@/lib/foundation/shadowing/deterministic-chunker";
import type { YouTubeTranscriptSegment } from "@/types/shadowing";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transcript } = body;

    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return NextResponse.json(
        { error: "Dữ liệu transcript phải là mảng các câu không rỗng." },
        { status: 400 }
      );
    }

    const segList = transcript as YouTubeTranscriptSegment[];
    // Pure deterministic phonetic chunking & stress words extraction (0ms latency, Zero AI)
    const result = generateDeterministicEnhancement(segList);

    return NextResponse.json({
      success: true,
      engine: "deterministic-phonetic-chunker",
      result,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: "Lỗi xử lý: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
