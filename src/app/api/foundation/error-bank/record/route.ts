import { NextRequest, NextResponse } from "next/server";
import { ingestErrorOccurrence } from "@/lib/foundation/error-bank/error-bank.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      patternKey,
      canonicalName = "Spoken Error",
      category = "grammar",
      labelVi,
      descriptionVi,
      userText,
      correction,
      contextSentence,
      sourceModule = "sentence_builder",
      responseLatencyMs,
      wasSelfCorrected,
      wasRetried,
      retrySucceeded,
      severity,
      confidenceScore,
    } = body;

    if (!patternKey || !userText || !correction) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: patternKey, userText, correction" },
        { status: 400 }
      );
    }

    const records = ingestErrorOccurrence({
      patternKey,
      canonicalName,
      category,
      labelVi: labelVi || "Lỗi cấu trúc khẩu ngữ",
      descriptionVi: descriptionVi || "Cần lưu ý dạng chuẩn xác khi nói.",
      userText,
      correction,
      contextSentence,
      sourceModule,
      responseLatencyMs,
      wasSelfCorrected,
      wasRetried,
      retrySucceeded,
      severity,
      confidenceScore,
    });

    return NextResponse.json({ success: true, count: records.length, records });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to record error occurrence",
      },
      { status: 500 }
    );
  }
}
