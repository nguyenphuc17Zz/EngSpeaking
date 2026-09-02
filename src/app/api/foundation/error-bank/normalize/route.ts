import { NextRequest, NextResponse } from "next/server";
import { normalizeErrorPattern } from "@/lib/foundation/error-bank/normalizer.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userSpokenText,
      expectedCorrection,
      contextSentence,
      responseLatencyMs,
      existingPatterns,
      provider,
      model,
    } = body;

    if (!userSpokenText || !expectedCorrection) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: userSpokenText, expectedCorrection" },
        { status: 400 }
      );
    }

    const normalized = await normalizeErrorPattern({
      userSpokenText,
      expectedCorrection,
      contextSentence,
      responseLatencyMs,
      existingPatterns,
      provider,
      model,
    });

    return NextResponse.json({ success: true, normalized });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to normalize error",
      },
      { status: 500 }
    );
  }
}
