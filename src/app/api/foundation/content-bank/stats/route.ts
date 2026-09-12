import { NextResponse } from "next/server";
import { getContentBankStats } from "@/lib/foundation/services/content-bank.service";

export async function GET() {
  try {
    const stats = await getContentBankStats();
    return NextResponse.json({
      success: true,
      stats,
      hybridPolicy: {
        bankRatio: 0.7,
        dynamicAIRatio: 0.3,
        antiRepetitionWindowDays: 14,
        deduplication: "SHA-256 normalized",
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to retrieve Content Bank stats",
      },
      { status: 500 }
    );
  }
}
