import { NextRequest, NextResponse } from "next/server";
import { generateTargetedCorrection } from "@/lib/foundation/retry-loop/correction-generator.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      userTranscript = "",
      expectedSentence = "",
      detectedErrors = [],
      provider,
      model,
    } = body;

    if (!prompt) {
      return NextResponse.json({ success: false, error: "Missing prompt" }, { status: 400 });
    }

    const targetedCorrection = await generateTargetedCorrection({
      prompt,
      userTranscript,
      expectedSentence,
      detectedErrors,
      provider,
      model,
    });

    return NextResponse.json({ success: true, targetedCorrection });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate targeted correction",
      },
      { status: 500 }
    );
  }
}
