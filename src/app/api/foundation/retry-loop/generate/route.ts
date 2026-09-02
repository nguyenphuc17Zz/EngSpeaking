import { NextRequest, NextResponse } from "next/server";
import { generateRepairChallenge } from "@/lib/foundation/retry-loop/challenge-generator.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { category, provider, model, recentPatterns } = body;

    const challenge = await generateRepairChallenge({
      category,
      provider,
      model,
      recentPatterns,
    });

    return NextResponse.json({ success: true, challenge });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate spoken repair challenge";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
