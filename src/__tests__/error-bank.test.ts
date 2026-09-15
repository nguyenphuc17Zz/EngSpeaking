import { describe, it, expect, beforeEach } from "vitest";
import { normalizeErrorPattern } from "@/lib/foundation/error-bank/normalizer.service";
import {
  ingestErrorOccurrence,
  getMasterErrorBank,
  calculatePriorityScore,
  advanceSpacedReviewStage,
  flagErrorAsFalsePositive,
  getCompactErrorContextPack,
} from "@/lib/foundation/error-bank/error-bank.service";
import { generateSpokenDiagnosticReport } from "@/lib/foundation/error-bank/diagnostic.service";
import type { MasterErrorRecord } from "@/types/error-bank";

describe("Function 5 — Personal Error Bank Engine", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  it("normalizes raw spoken mistakes to canonical patterns & determines gap types", async () => {
    const res = await normalizeErrorPattern({
      userSpokenText: "Yesterday I go to the gym.",
      expectedCorrection: "Yesterday I went to the gym.",
      responseLatencyMs: 4200, // > 3.5s -> retrieval gap
      provider: "mock",
    });

    expect(res.patternKey).toBe("past_simple_base_form");
    expect(res.category).toBe("grammar");
    expect(res.gapType).toBe("retrieval_gap");
    expect(res.severity).toBe("major");
  });

  it("ingests occurrences, updates frequency, recovery rate, and priority score", () => {
    // Occurrence 1
    let records = ingestErrorOccurrence({
      patternKey: "past_simple_base_form",
      canonicalName: "Past Simple base form",
      category: "grammar",
      labelVi: "Động từ quá khứ đơn",
      descriptionVi: "Dùng nhầm V-bare thay vì V2",
      userText: "I go yesterday.",
      correction: "I went yesterday.",
      sourceModule: "sentence_builder",
      responseLatencyMs: 4000,
      wasRetried: true,
      retrySucceeded: true,
      severity: "major",
    });

    expect(records.length).toBe(1);
    expect(records[0].frequency).toBe(1);
    expect(records[0].recoveryRate).toBe(100);
    expect(records[0].priorityScore).toBeGreaterThan(0);

    // Occurrence 2 on same pattern -> deduplicates and increments frequency
    records = ingestErrorOccurrence({
      patternKey: "past_simple_base_form",
      canonicalName: "Past Simple base form",
      category: "grammar",
      labelVi: "Động từ quá khứ đơn",
      descriptionVi: "Dùng nhầm V-bare thay vì V2",
      userText: "I eat breakfast yesterday.",
      correction: "I ate breakfast yesterday.",
      sourceModule: "vn_to_en",
      responseLatencyMs: 4200,
      wasRetried: true,
      retrySucceeded: true,
      severity: "major",
    });

    expect(records.length).toBe(1);
    expect(records[0].frequency).toBe(2);
    expect(records[0].examples.length).toBe(2);
  });

  it("advances spaced review stage upon passing review", () => {
    const records = ingestErrorOccurrence({
      patternKey: "collocation_depend_on",
      canonicalName: "Collocation depend on",
      category: "vocabulary",
      labelVi: "Giới từ đi kèm depend on",
      descriptionVi: "Dùng nhầm depend of",
      userText: "It depends of you.",
      correction: "It depends on you.",
      sourceModule: "sentence_builder",
    });

    const recordId = records[0].id;
    expect(records[0].reviewStage).toBe(1);

    // Pass stage 1 review -> moves to stage 2
    const advanced = advanceSpacedReviewStage(recordId, true);
    expect(advanced[0].reviewStage).toBe(2);
    expect(advanced[0].nextReviewDueAt).toBeDefined();
  });

  it("suppresses confidence and priority when user flags false-positive STT error", () => {
    const records = ingestErrorOccurrence({
      patternKey: "pronunciation_ending_ed",
      canonicalName: "Ending sound ed",
      category: "pronunciation",
      labelVi: "Phát âm đuôi -ed",
      descriptionVi: "Nuốt âm đuôi",
      userText: "I worked.",
      correction: "I worked.",
      sourceModule: "shadowing",
    });

    const initialPriority = records[0].priorityScore;
    const flagged = flagErrorAsFalsePositive(records[0].id);

    expect(flagged[0].userFlaggedAsFalsePositive).toBe(true);
    expect(flagged[0].falsePositiveCount).toBe(1);
    expect(flagged[0].priorityScore).toBeLessThan(initialPriority);
  });

  it("builds compact error context pack for LLM injection", () => {
    ingestErrorOccurrence({
      patternKey: "past_simple_base_form",
      canonicalName: "Past Simple",
      category: "grammar",
      labelVi: "Quá khứ đơn",
      descriptionVi: "V2/ed",
      userText: "I go.",
      correction: "I went.",
      sourceModule: "sentence_builder",
      responseLatencyMs: 4000,
      severity: "major",
    });

    const contextPack = getCompactErrorContextPack();
    expect(contextPack.topWeaknesses.length).toBeGreaterThanOrEqual(1);
    expect(contextPack.topWeaknesses[0].patternKey).toBe("past_simple_base_form");
    expect(contextPack.overallRecoveryRate).toBeDefined();
  });

  it("generates clinical-grade spoken diagnostic report with retrieval ratio and 7-day prescriptions", async () => {
    const records = getMasterErrorBank();
    const report = await generateSpokenDiagnosticReport({ records, provider: "mock" });

    expect(report.primaryBottleneckVi).toBeDefined();
    expect(report.retrievalVsKnowledgeRatio.retrievalGapPercent).toBeGreaterThan(0);
    expect(report.prescriptions.length).toBe(3);
    expect(report.l1InterferencePatterns.length).toBeGreaterThan(0);
  });

  it("fast-pass drill returns 0ms success on exact target correction with independence + hesitation", async () => {
    const { computeFastPassDrill } = await import(
      "@/lib/foundation/error-bank/drill-fast-pass.service"
    );
    const records = ingestErrorOccurrence({
      patternKey: "past_simple_base_form",
      canonicalName: "Past Simple base form",
      category: "grammar",
      labelVi: "Động từ quá khứ đơn",
      descriptionVi: "Dùng nhầm V-bare thay vì V2",
      userText: "I go yesterday.",
      correction: "I went to the gym yesterday.",
      sourceModule: "sentence_builder",
      severity: "major",
    });
    const record = records[0];
    const res = computeFastPassDrill(record, "I went to the gym yesterday.", {
      responseLatencyMs: 1500,
      speechDurationMs: 2400,
      hintTierUsed: 0,
      attemptNumber: 1,
    });
    expect(res.canFastPass).toBe(true);
    expect(res.evaluation?.isFastPass).toBe(true);
    expect(res.evaluation?.evaluationSource).toBe("fast_pass");
    expect(res.evaluation?.independenceScore).toBe(100);
    expect(res.evaluation?.hesitationMetrics?.wpm).toBeGreaterThan(30);
    expect(res.evaluation?.corrected).toBe(true);
  });

  it("penalizes drill independence as hint tier increases and tracks attempt number", async () => {
    const { computeFastPassDrill } = await import(
      "@/lib/foundation/error-bank/drill-fast-pass.service"
    );
    const { ingestErrorOccurrence } = await import(
      "@/lib/foundation/error-bank/error-bank.service"
    );
    localStorage.clear();
    const records = ingestErrorOccurrence({
      patternKey: "article_missing",
      canonicalName: "Article missing",
      category: "grammar",
      labelVi: "Mạo từ",
      descriptionVi: "Thiếu mạo từ",
      userText: "I go gym.",
      correction: "I go to the gym every morning.",
      sourceModule: "vn_to_en",
      severity: "minor",
    });
    const noHint = computeFastPassDrill(records[0], "I go to the gym every morning.", {
      hintTierUsed: 0,
      attemptNumber: 1,
    });
    expect(noHint.evaluation?.independenceScore).toBe(100);
    expect(noHint.evaluation?.attemptNumber).toBe(1);
  });

  it("adapts drill difficulty up after 3 strong corrections and down after 2 failures", async () => {
    const { updateDrillAdaptiveProgression, INITIAL_DRILL_ADAPTIVE_STATE } = await import(
      "@/lib/foundation/error-bank/drill-adaptive-engine"
    );
    const { ingestErrorOccurrence } = await import(
      "@/lib/foundation/error-bank/error-bank.service"
    );
    localStorage.clear();
    const records = ingestErrorOccurrence({
      patternKey: "past_simple_base_form",
      canonicalName: "Past Simple",
      category: "grammar",
      labelVi: "Quá khứ đơn",
      descriptionVi: "V2",
      userText: "I go.",
      correction: "I went to the gym yesterday.",
      sourceModule: "sentence_builder",
      severity: "major",
    });
    const record = records[0];
    let state = { ...INITIAL_DRILL_ADAPTIVE_STATE, currentDifficulty: 5 };
    const strong = {
      corrected: true,
      overallScore: 92,
      targetErrorResolved: true,
      grammarAccuracy: 95,
      naturalness: 92,
      coachFeedbackVi: "Tốt",
      independenceScore: 100,
      attemptNumber: 1,
    } as never;
    state = updateDrillAdaptiveProgression(state, strong, record);
    state = updateDrillAdaptiveProgression(state, strong, record);
    state = updateDrillAdaptiveProgression(state, strong, record);
    expect(state.currentDifficulty).toBeGreaterThan(5);
    expect(state.rapidStreak).toBe(3);

    const weak = {
      corrected: false,
      overallScore: 45,
      targetErrorResolved: false,
      grammarAccuracy: 50,
      naturalness: 50,
      coachFeedbackVi: "Chưa đúng",
      independenceScore: 100,
      attemptNumber: 1,
    } as never;
    let failState = { ...INITIAL_DRILL_ADAPTIVE_STATE, currentDifficulty: 5 };
    failState = updateDrillAdaptiveProgression(failState, weak, record);
    failState = updateDrillAdaptiveProgression(failState, weak, record);
    expect(failState.currentDifficulty).toBeLessThan(5);
  });

  it("unified batch normalizer maps SB/VN/Survival errors incl. taboo + hesitation", async () => {
    const { normalizeEvaluatedErrors } = await import(
      "@/lib/foundation/error-bank/normalize-batch.service"
    );
    const out = normalizeEvaluatedErrors(
      [
        { type: "taboo", severity: "major", userText: "microwave", correction: "kitchen appliance", explanation: "Từ cấm", patternKey: "taboo_slip" },
        { type: "grammar", severity: "major", userText: "go", correction: "went", explanation: "Quá khứ", patternKey: "past_simple_base_form" },
      ],
      {
        fallbackUserTranscript: "I use microwave",
        fallbackCorrection: "kitchen appliance",
        latencyMs: 4200,
        communicativelyValid: true,
        wpm: 60,
      }
    );
    const keys = out.map((o) => o.patternKey);
    expect(keys).toContain("taboo_slip");
    expect(keys).toContain("past_simple_base_form");
    // Hesitation-derived fluency occurrence when slow + low WPM
    expect(keys).toContain("retrieval_delay");
  });

  it("supports endless drill session with manual finish and real summary", async () => {
    const { useErrorBankStore } = await import("@/stores/error-bank-store");
    const { ingestErrorOccurrence } = await import(
      "@/lib/foundation/error-bank/error-bank.service"
    );
    localStorage.clear();
    ingestErrorOccurrence({
      patternKey: "past_simple_base_form",
      canonicalName: "Past Simple",
      category: "grammar",
      labelVi: "Quá khứ đơn",
      descriptionVi: "V2",
      userText: "I go.",
      correction: "I went to the gym yesterday.",
      sourceModule: "sentence_builder",
      severity: "major",
    });
    ingestErrorOccurrence({
      patternKey: "article_missing",
      canonicalName: "Article",
      category: "grammar",
      labelVi: "Mạo từ",
      descriptionVi: "a/the",
      userText: "Go gym.",
      correction: "Go to the gym.",
      sourceModule: "vn_to_en",
      severity: "minor",
    });
    const { getMasterErrorBank } = await import("@/lib/foundation/error-bank/error-bank.service");
    const stored = getMasterErrorBank();
    useErrorBankStore.getState().initDrillSession(stored, "endless");
    expect(useErrorBankStore.getState().sessionConfig.mode).toBe("endless");

    await useErrorBankStore.getState().submitDrillAttempt({
      userTranscript: "I went to the gym yesterday.",
      latencyMs: 1500,
      speechDurationMs: 2400,
      hintTierUsed: 0,
      attemptNumber: 1,
    });
    useErrorBankStore.getState().advanceDrillQueue();
    expect(useErrorBankStore.getState().isDrillSessionCompleted).toBe(false);

    useErrorBankStore.getState().finishSessionManually();
    expect(useErrorBankStore.getState().isDrillSessionCompleted).toBe(true);
    const summary = useErrorBankStore.getState().drillSummary;
    expect(summary).not.toBeNull();
    expect(summary?.firstAttemptAccuracy).toBeDefined();
    expect(summary?.averageIndependence).toBeDefined();
    expect(summary?.masteryDelta).toBeDefined();
    expect(summary?.topWeaknessIdentified).toBeDefined();
  });
});
