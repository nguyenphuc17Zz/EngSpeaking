import { NextRequest, NextResponse } from "next/server";
import { simplifySentence } from "@/lib/foundation/retry-loop/simplification.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { originalPromptVi, originalEnglish, targetErrorPattern, provider, model } = body;

    if (!originalPromptVi || !originalEnglish) {
      return NextResponse.json({ success: false, error: "Missing required text fields" }, { status: 400 });
    }

    const simplification = await simplifySentence({
      originalPromptVi,
      originalEnglish,
      targetErrorPattern,
      provider,
      model,
    });

    return NextResponse.json({ success: true, simplification });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to simplify sentence",
      },
      { status: 500 }
    );
  }
}
