import { NextRequest, NextResponse } from "next/server";
import {
  flagErrorAsFalsePositive,
  advanceSpacedReviewStage,
} from "@/lib/foundation/error-bank/error-bank.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { errorRecordId, action, reviewPassed = true } = body;

    if (!errorRecordId || !action) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: errorRecordId, action" },
        { status: 400 }
      );
    }

    if (action === "flag_false_positive") {
      const records = flagErrorAsFalsePositive(errorRecordId);
      return NextResponse.json({ success: true, action: "flagged_false_positive", records });
    }

    if (action === "advance_review") {
      const records = advanceSpacedReviewStage(errorRecordId, reviewPassed);
      return NextResponse.json({ success: true, action: "advanced_review", records });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process error feedback",
      },
      { status: 500 }
    );
  }
}
