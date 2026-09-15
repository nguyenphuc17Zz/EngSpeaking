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
      errors,
      gapType,
    } = body;

    // Batch mode: normalized occurrences from normalize-batch.service
    if (Array.isArray(errors) && errors.length > 0) {
      const { ingestEvaluatedErrors } = await import(
        "@/lib/foundation/error-bank/error-bank.service"
      );
      const records = ingestEvaluatedErrors(
        errors.map((e: Record<string, unknown>) => ({
          patternKey: String(e.patternKey || "general_grammar"),
          canonicalName: String(e.canonicalName || e.correction || "Spoken Error"),
          category: (e.category as "grammar" | "vocabulary" | "pronunciation" | "fluency") || "grammar",
          labelVi: String(e.labelVi || "Lỗi cấu trúc khẩu ngữ"),
          descriptionVi: String(e.descriptionVi || "Cần lưu ý dạng chuẩn xác khi nói."),
          severity: (e.severity as "minor" | "moderate" | "major" | "critical") || "moderate",
          gapType: (e.gapType as "knowledge_gap" | "retrieval_gap" | "production_gap" | "pronunciation_gap") || gapType || undefined,
          confidenceScore: typeof e.confidenceScore === "number" ? e.confidenceScore : 0.9,
          userText: String(e.userText || userText || ""),
          correction: String(e.correction || correction || ""),
          contextSentence: (e.contextSentence as string) || contextSentence,
        })),
        { sourceModule, responseLatencyMs, wasRetried, retrySucceeded, wasSelfCorrected }
      );
      return NextResponse.json({ success: true, count: records.length, records });
    }

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
