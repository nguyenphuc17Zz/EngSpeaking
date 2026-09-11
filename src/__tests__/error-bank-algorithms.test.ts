import { describe, it, expect, beforeEach } from "vitest";
import {
  computeFSRSUpdate,
  calculateRetrievability,
  mapPerformanceToFSRSRating,
} from "@/lib/foundation/error-bank/fsrs-engine";
import {
  computeBKTUpdate,
  DEFAULT_BKT_PARAMS,
} from "@/lib/foundation/error-bank/bkt-engine";
import {
  detectL1Interference,
  assessFossilizationRisk,
} from "@/lib/foundation/error-bank/fossilization-engine";
import {
  ingestErrorOccurrence,
  calculatePriorityScore,
  advanceSpacedReviewStage,
  buildErrorBankPedagogicalPrompt,
  getMasterErrorBank,
} from "@/lib/foundation/error-bank/error-bank.service";
import type { MasterErrorRecord } from "@/types/error-bank";

describe("Personal Error Bank — 4 Algorithmic Breakthroughs", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  // ==========================================
  // 1. FSRS Spaced Repetition Engine Tests
  // ==========================================
  describe("1. FSRS Spaced Repetition (DSR Model)", () => {
    it("maps fast fluent response (<2000ms) to Easy (Rating 4) and hesitant (>3800ms) to Hard (Rating 2)", () => {
      expect(mapPerformanceToFSRSRating(false, 1500)).toBe(1); // Failed -> Again
      expect(mapPerformanceToFSRSRating(true, 4200)).toBe(2); // Passed but slow -> Hard
      expect(mapPerformanceToFSRSRating(true, 2800)).toBe(3); // Normal -> Good
      expect(mapPerformanceToFSRSRating(true, 1700)).toBe(4); // Fast automaticity -> Easy
    });

    it("applies spoken latency penalty: slow speech results in lower stability growth", () => {
      const fastResult = computeFSRSUpdate({
        currentStability: 2.0,
        currentDifficulty: 5.0,
        lastReviewAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        passed: true,
        responseLatencyMs: 1800, // fast
      });

      const slowResult = computeFSRSUpdate({
        currentStability: 2.0,
        currentDifficulty: 5.0,
        lastReviewAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        passed: true,
        responseLatencyMs: 4800, // hesitant struggle
      });

      expect(fastResult.stability).toBeGreaterThan(slowResult.stability);
    });

    it("calculates decaying retrievability over elapsed days", () => {
      const stabilityDays = 3.0;
      const today = new Date().toISOString();
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString();

      const rToday = calculateRetrievability(stabilityDays, today);
      const rTenDaysAgo = calculateRetrievability(stabilityDays, tenDaysAgo);

      expect(rToday).toBe(100);
      expect(rTenDaysAgo).toBeLessThan(80);
    });
  });

  // ==========================================
  // 2. Bayesian Knowledge Tracing (BKT) Engine
  // ==========================================
  describe("2. Bayesian Knowledge Tracing (BKT)", () => {
    it("increases P(L) after consecutive correct attempts", () => {
      const step1 = computeBKTUpdate({
        currentPMastery: DEFAULT_BKT_PARAMS.pL0,
        correct: true,
        category: "grammar",
      });
      expect(step1.pMastery).toBeGreaterThan(DEFAULT_BKT_PARAMS.pL0);

      const step2 = computeBKTUpdate({
        currentPMastery: step1.pMastery,
        correct: true,
        category: "grammar",
      });
      expect(step2.pMastery).toBeGreaterThan(step1.pMastery);
    });

    it("detects Slips: an error by a learner with high mastery under speed pressure is flagged as a slip", () => {
      const result = computeBKTUpdate({
        currentPMastery: 0.85,
        correct: false,
        category: "grammar",
        responseLatencyMs: 1500, // fast speech slip
      });

      expect(result.isSlip).toBe(true);
      expect(result.gapType).toBe("retrieval_gap");
    });

    it("diagnoses low mastery (<0.45) as knowledge_gap", () => {
      const result = computeBKTUpdate({
        currentPMastery: 0.15,
        correct: false,
        category: "grammar",
        responseLatencyMs: 3000,
      });

      expect(result.gapType).toBe("knowledge_gap");
    });
  });

  // ==========================================
  // 3. L1 Vietnamese Interference & Fossilization
  // ==========================================
  describe("3. L1 Vietnamese Interference & Fossilization Risk", () => {
    it("detects characteristic Vietnamese transfer patterns", () => {
      expect(detectL1Interference("ending_sound_ed", "pronunciation")).toBe("ending_sound_omission");
      expect(detectL1Interference("past_simple_base_form", "grammar")).toBe("tense_drop");
      expect(detectL1Interference("collocation_make_party", "vocabulary")).toBe("collocation_calque");
    });

    it("calculates fossilization risk index correctly based on frequency and failure rate", () => {
      // High frequency + 0% recovery + L1 pattern -> High fossilization
      const highRisk = assessFossilizationRisk({
        frequency: 8,
        recoveryRate: 20,
        patternKey: "ending_sound_ed",
        category: "pronunciation",
        averageLatencyMs: 4200,
      });

      expect(highRisk.fossilizationScore).toBeGreaterThanOrEqual(65);
      expect(highRisk.fossilizationLevel).toBe("fossilized");

      // Low frequency + high recovery -> Emerging
      const lowRisk = assessFossilizationRisk({
        frequency: 1,
        recoveryRate: 100,
        patternKey: "word_choice_minor",
        category: "vocabulary",
        averageLatencyMs: 2000,
      });

      expect(lowRisk.fossilizationScore).toBeLessThan(35);
      expect(lowRisk.fossilizationLevel).toBe("emerging");
    });
  });

  // ==========================================
  // 4. Ingestion, Priority & Dynamic AI Injection
  // ==========================================
  describe("4. End-to-End Service & Dynamic AI Injection", () => {
    it("ingests an error and populates FSRS, BKT, and Fossilization fields", () => {
      const records = ingestErrorOccurrence({
        patternKey: "past_simple_go",
        canonicalName: "Past simple irregular verb",
        category: "grammar",
        labelVi: "Động từ quá khứ (go -> went)",
        descriptionVi: "Quên chia quá khứ khi nói về hôm qua",
        userText: "Yesterday I go to school",
        correction: "Yesterday I went to school",
        sourceModule: "sentence_builder",
        responseLatencyMs: 4000,
        wasRetried: true,
        retrySucceeded: true,
      });

      expect(records.length).toBe(1);
      const rec = records[0];
      expect(rec.fsrsStability).toBeDefined();
      expect(rec.fsrsDifficulty).toBeDefined();
      expect(rec.pMastery).toBeGreaterThan(0);
      expect(rec.fossilizationScore).toBeGreaterThanOrEqual(0);
      expect(rec.priorityScore).toBeGreaterThan(0);
    });

    it("advances spaced review stage and updates FSRS due date", () => {
      ingestErrorOccurrence({
        patternKey: "ending_sound_s",
        canonicalName: "Ending consonant /s/",
        category: "pronunciation",
        labelVi: "Âm đuôi /s/",
        descriptionVi: "Bỏ âm đuôi",
        userText: "She like coffee",
        correction: "She likes coffee",
        sourceModule: "sentence_builder",
        responseLatencyMs: 2200,
      });

      const records = getMasterErrorBank();
      const updated = advanceSpacedReviewStage(records[0].id, true, 1900);
      expect(updated[0].reviewStage).toBe(2);
      expect(updated[0].nextReviewDueAt).toBeDefined();
    });

    it("builds a targeted pedagogical constraint prompt from due/fossilized errors", () => {
      const mockRecords: MasterErrorRecord[] = [
        {
          id: "rec_1",
          patternKey: "past_simple_went",
          canonicalName: "Past simple irregular",
          category: "grammar",
          labelVi: "Quá khứ went",
          descriptionVi: "Dùng nhầm go thay vì went",
          severity: "major",
          gapType: "retrieval_gap",
          frequency: 5,
          recentFrequency: 3,
          firstAttemptFailures: 4,
          firstAttemptSuccesses: 1,
          totalAttempts: 5,
          accuracy: 20,
          retryTriggeredCount: 3,
          retrySuccessCount: 1,
          recoveryRate: 33,
          selfCorrectionCount: 0,
          averageLatencyMs: 4200,
          latencyWhenWrongMs: 4500,
          latencyWhenCorrectMs: 3800,
          status: "persistent",
          trend: "worsening",
          confidenceScore: 0.95,
          falsePositiveCount: 0,
          userFlaggedAsFalsePositive: false,
          firstSeenAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          lastSeenAt: new Date().toISOString(),
          nextReviewDueAt: new Date(Date.now() - 3600000).toISOString(), // Due 1 hour ago
          reviewStage: 1,
          fsrsStability: 0.5,
          fsrsDifficulty: 7.2,
          retrievability: 65, // Low retrievability
          pMastery: 0.35,
          fossilizationScore: 78,
          fossilizationLevel: "fossilized",
          examples: [
            {
              id: "ex_1",
              userText: "I go yesterday",
              correction: "I went yesterday",
              sourceModule: "sentence_builder",
              timestamp: new Date().toISOString(),
            },
          ],
          priorityScore: 85,
        },
      ];

      const prompt = buildErrorBankPedagogicalPrompt(mockRecords);
      expect(prompt).not.toBeNull();
      expect(prompt).toContain("PEDAGOGICAL CONSTRAINT (Targeted Personal Error Bank Review)");
      expect(prompt).toContain("Quá khứ went");
      expect(prompt).toContain("I went yesterday");
    });
  });
});
