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
});
