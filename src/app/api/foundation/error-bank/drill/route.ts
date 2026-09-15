import { NextRequest, NextResponse } from "next/server";
import { generateTextWithRouting } from "@/lib/ai";
import { advanceSpacedReviewStage } from "@/lib/foundation/error-bank/error-bank.service";
import { drillEvaluationSchema } from "@/lib/validation/error-bank-schemas";
import {
  computeFastPassDrill,
  calculateHesitationMetrics,
  independenceFromTier,
  normalizeSpokenText,
} from "@/lib/foundation/error-bank/drill-fast-pass.service";
import type { MasterErrorRecord, DrillEvaluationResult } from "@/types/error-bank";

const DRILL_EVALUATOR_SYSTEM = `You are an AI Spoken English Drill Evaluator for a Vietnamese learner.
COMMUNICATIVE CORRECTNESS FIRST: if the target error is fixed and the sentence is clear, do NOT fail for minor slips.
Evaluate strictly whether:
1. The target error pattern has been corrected
2. The sentence is grammatically natural and communicatively clear
3. MULTI-DIMENSIONAL SCORING (0-100): conceptClarityScore, grammarAccuracy, naturalness, fluencyScore, retrievalScore (latency + hint independence), independenceScore (100/90/75/50/15 by hint tier 0-4). overallScore weighted composite. corrected = overallScore >= 70 AND targetErrorResolved.
4. ERRORS: max 2 impactful fixes with type/severity/userText/correction/explanation (Vietnamese)/patternKey.
5. SAY IT BETTER: professional/casual/idiomatic trio + praisePoints (2) + actionableFeedback (Vietnamese).

OUTPUT STRICT JSON ONLY. NO MARKDOWN:
{
  "corrected": boolean,
  "overallScore": number (0-100),
  "targetErrorResolved": boolean,
  "grammarAccuracy": number (0-100),
  "naturalness": number (0-100),
  "conceptClarityScore": number (0-100),
  "fluencyScore": number (0-100),
  "retrievalScore": number (0-100),
  "independenceScore": number (0-100),
  "errors": [{"type": "grammar"|"vocabulary"|"pronunciation"|"fluency"|"omission"|"strategy", "severity": "minor"|"major", "userText": string, "correction": string, "explanation": string, "patternKey": string}],
  "coachFeedbackVi": string (1-2 sentences Vietnamese),
  "actionableFeedback": string,
  "praisePoints": string[],
  "betterPhrasing": string,
  "sayItBetter": {"professional": string, "casual": string, "idiomatic": string},
  "naturalAlternatives": [{"expression": string, "tone": string, "explanationVi": string}],
  "isSayItBetterNeeded": boolean,
  "userTranscript": string,
  "cleanTranscript": string,
  "hintTierUsed": number,
  "attemptNumber": number,
  "evaluationSource": "ai_llm",
  "isFastPass": false
}`;

function buildDrillEvalUserPrompt(params: {
  errorPatternLabelVi: string;
  originalUserText: string;
  targetCorrection: string;
  userNewTranscript: string;
  responseLatencyMs?: number;
  speechDurationMs?: number;
  hintTierUsed?: number;
  attemptNumber?: number;
}): string {
  return `Error Pattern: "${params.errorPatternLabelVi}"
Original Mistake: "${params.originalUserText}"
Target Correction: "${params.targetCorrection}"
Learner New Attempt: "${params.userNewTranscript}"
Response Latency: ${params.responseLatencyMs ? `${params.responseLatencyMs}ms` : "N/A"}
Speech Duration: ${params.speechDurationMs ? `${params.speechDurationMs}ms` : "N/A"}
Hint Tier Used (0-4): ${params.hintTierUsed ?? 0}
Attempt Number: ${params.attemptNumber ?? 1}

Evaluate if the learner corrected the error. Return strict JSON.`;
}

function buildDeterministicFallback(
  record: MasterErrorRecord,
  userTranscript: string,
  targetCorrection: string,
  originalUserText: string,
  latencyMs: number,
  speechDurationMs: number,
  hintTierUsed: number,
  attemptNumber: number
): DrillEvaluationResult {
  const hesitationMetrics = calculateHesitationMetrics({
    userTranscript,
    speechDurationMs,
  });
  const independenceScore = independenceFromTier(hintTierUsed);
  const corrected = normalizeSpokenText(userTranscript).length >= 3;
  return {
    corrected,
    overallScore: corrected ? 78 : 45,
    targetErrorResolved: corrected,
    grammarAccuracy: corrected ? 82 : 50,
    naturalness: corrected ? 80 : 50,
    conceptClarityScore: corrected ? 82 : 45,
    fluencyScore: hesitationMetrics.hesitationLevel === "smooth" ? 88 : 70,
    retrievalScore: Math.min(100, Math.max(40, Math.round(independenceScore * 0.6 + 25))),
    independenceScore,
    errors: [],
    praisePoints: corrected ? ["Đã dám bật nói để sửa lỗi."] : ["Đã dám thử lại."],
    actionableFeedback: `Mục tiêu: "${targetCorrection}". Hãy nhại lại đúng pattern "${record.labelVi}".`,
    coachFeedbackVi: `Mục tiêu: "${targetCorrection}". Hãy nhại lại đúng pattern "${record.labelVi}".`,
    betterPhrasing: targetCorrection,
    sayItBetter: { professional: targetCorrection, casual: targetCorrection, idiomatic: targetCorrection },
    naturalAlternatives: [{ expression: targetCorrection, tone: "neutral", explanationVi: "Câu chuẩn mục tiêu" }],
    isSayItBetterNeeded: corrected,
    userTranscript,
    cleanTranscript: normalizeSpokenText(userTranscript),
    hintTierUsed,
    attemptNumber,
    evaluationSource: "deterministic",
    hesitationMetrics,
    isFastPass: false,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      record,
      userTranscript,
      latencyMs,
      speechDurationMs = 2200,
      hintTierUsed = 0,
      attemptNumber = 1,
      provider = "gemini",
      model = "auto",
    }: {
      record: MasterErrorRecord;
      userTranscript: string;
      latencyMs: number;
      speechDurationMs?: number;
      hintTierUsed?: number;
      attemptNumber?: number;
      provider?: string;
      model?: string;
    } = body;

    if (!record || !userTranscript) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: record, userTranscript" },
        { status: 400 }
      );
    }

    const latestExample = record.examples[record.examples.length - 1];
    const originalUserText = latestExample?.userText || record.canonicalName;
    const targetCorrection = latestExample?.correction || record.canonicalName;

    // Fast-pass 0ms before any LLM call
    const fastPass = computeFastPassDrill(record, userTranscript, {
      responseLatencyMs: latencyMs,
      speechDurationMs,
      hintTierUsed,
      attemptNumber,
    });
    if (fastPass.canFastPass && fastPass.evaluation) {
      let updatedRecords: MasterErrorRecord[] = [];
      try {
        updatedRecords = advanceSpacedReviewStage(record.id, true, latencyMs);
      } catch {}
      return NextResponse.json({
        success: true,
        evaluation: fastPass.evaluation,
        updatedRecords,
        targetCorrection,
        originalUserText,
      });
    }

    if (provider === "mock") {
      const evaluation = buildDeterministicFallback(
        record,
        userTranscript,
        targetCorrection,
        originalUserText,
        latencyMs,
        speechDurationMs,
        hintTierUsed,
        attemptNumber
      );
      return NextResponse.json({
        success: true,
        evaluation,
        updatedRecords: [],
        targetCorrection,
        originalUserText,
      });
    }

    const userPrompt = buildDrillEvalUserPrompt({
      errorPatternLabelVi: record.labelVi,
      originalUserText,
      targetCorrection,
      userNewTranscript: userTranscript,
      responseLatencyMs: latencyMs,
      speechDurationMs,
      hintTierUsed,
      attemptNumber,
    });

    const attemptEvaluate = async (): Promise<DrillEvaluationResult | null> => {
      try {
        const res = await generateTextWithRouting({
          provider,
          model,
          input: {
            messages: [{ role: "user", content: userPrompt }],
            systemInstruction: DRILL_EVALUATOR_SYSTEM,
            temperature: 0.2,
            maxOutputTokens: 900,
          },
        });
        const cleaned = res.text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
        const parsed = JSON.parse(cleaned) as Record<string, unknown>;
        parsed.userTranscript = userTranscript;
        if (typeof parsed.cleanTranscript !== "string" || !parsed.cleanTranscript) {
          parsed.cleanTranscript = normalizeSpokenText(userTranscript);
        }
        parsed.hintTierUsed = hintTierUsed;
        parsed.attemptNumber = attemptNumber;
        parsed.evaluationSource = "ai_llm";
        parsed.isFastPass = false;
        if (!parsed.hesitationMetrics) {
          parsed.hesitationMetrics = calculateHesitationMetrics({
            userTranscript,
            speechDurationMs,
          });
        }
        if (typeof parsed.independenceScore !== "number") {
          parsed.independenceScore = independenceFromTier(hintTierUsed);
        }
        const validated = drillEvaluationSchema.safeParse(parsed);
        if (!validated.success) return null;
        return validated.data as DrillEvaluationResult;
      } catch {
        return null;
      }
    };

    let evaluation = await attemptEvaluate();
    if (!evaluation) evaluation = await attemptEvaluate();
    if (!evaluation) {
      evaluation = buildDeterministicFallback(
        record,
        userTranscript,
        targetCorrection,
        originalUserText,
        latencyMs,
        speechDurationMs,
        hintTierUsed,
        attemptNumber
      );
    }

    // Advance FSRS spaced review stage based on correction success
    let updatedRecords: MasterErrorRecord[] = [];
    try {
      updatedRecords = advanceSpacedReviewStage(record.id, evaluation.corrected, latencyMs);
    } catch {
      // Non-fatal — continue even if FSRS update fails
    }

    return NextResponse.json({
      success: true,
      evaluation,
      updatedRecords,
      targetCorrection,
      originalUserText,
    });
  } catch (error: unknown) {
    console.error("[ErrorBank Drill] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to evaluate drill attempt",
      },
      { status: 500 }
    );
  }
}
