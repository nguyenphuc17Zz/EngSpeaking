import { describe, it, expect } from "vitest";
import { generateTargetedCorrection } from "@/lib/foundation/retry-loop/correction-generator.service";
import { evaluateRepairAttempt } from "@/lib/foundation/retry-loop/retry-evaluator.service";
import { simplifySentence } from "@/lib/foundation/retry-loop/simplification.service";
import { generateRepairChallenge } from "@/lib/foundation/retry-loop/challenge-generator.service";
import {
  createRetrySession,
  recordRetryAttemptInSession,
} from "@/lib/foundation/retry-loop/retry-engine";
import type { TargetedCorrection } from "@/types/retry-loop";

describe("Function 3 — Retry Loop (Correct -> Say Again) Engine", () => {
  it("generates minimal targeted correction contrasting error and fix", async () => {
    const correction = await generateTargetedCorrection({
      prompt: "Hôm qua tôi đi tập gym sau giờ làm.",
      userTranscript: "Yesterday I go to the gym after work.",
      expectedSentence: "Yesterday, I went to the gym after work.",
      detectedErrors: [
        {
          type: "grammar",
          userText: "go",
          correction: "went",
          explanation: "Dùng thì quá khứ đơn 'went'.",
        },
      ],
      provider: "mock",
    });

    expect(correction.userErroneousText).toBe("go");
    expect(correction.minimalCorrection).toBe("went");
    expect(correction.priority).toBe(2);
    expect(correction.betterSentence).toBe("Yesterday, I went to the gym after work.");
    expect(correction.skeletonHint).toBeDefined();
  });

  it("evaluates spoken repair attempt specifically for target resolution", async () => {
    const mockCorrection: TargetedCorrection = {
      errorType: "grammar",
      priority: 2,
      patternKey: "past_simple_verb",
      whatToFix: "Thì Quá khứ đơn",
      userErroneousText: "go",
      minimalCorrection: "went",
      explanationVi: "Dùng 'went' cho quá khứ.",
      betterSentence: "Yesterday, I went to the gym after work.",
      skeletonHint: "Yesterday, I ______ to the gym after work.",
    };

    // 1. Successful repair
    const successResult = await evaluateRepairAttempt({
      targetCorrection: mockCorrection,
      userRetryTranscript: "Yesterday, I went to the gym after work.",
      originalTranscript: "Yesterday I go to the gym after work.",
      expectedSentence: "Yesterday, I went to the gym after work.",
      attemptNumber: 1,
      provider: "mock",
    });

    expect(successResult.isTargetErrorResolved).toBe(true);
    expect(successResult.isSuccessful).toBe(true);
    expect(successResult.overallRepairScore).toBeGreaterThanOrEqual(90);

    // 2. Self-correction detection mid-sentence
    const selfCorrectionResult = await evaluateRepairAttempt({
      targetCorrection: mockCorrection,
      userRetryTranscript: "Yesterday I go—sorry, I went to the gym.",
      originalTranscript: "Yesterday I go to the gym.",
      expectedSentence: "Yesterday, I went to the gym.",
      attemptNumber: 1,
      provider: "mock",
    });

    expect(selfCorrectionResult.selfCorrectionDetected).toBe(true);
    expect(selfCorrectionResult.isSuccessful).toBe(true);
    expect(selfCorrectionResult.overallRepairScore).toBe(100);
  });

  it("reduces cognitive overload via simplification service", async () => {
    const simplified = await simplifySentence({
      originalPromptVi: "Mặc dù tôi rất mệt sau giờ làm, tôi vẫn quyết định đi tập gym vì muốn giữ vóc dáng.",
      originalEnglish: "Although I was very tired after work, I decided to go to the gym because I wanted to stay in shape.",
      targetErrorPattern: "past_simple_verb",
      provider: "mock",
    });

    expect(simplified.simplifiedEnglish).toBeDefined();
    expect(simplified.simplifiedEnglish.length).toBeLessThan(80);
    expect(simplified.reductionReason).toBeDefined();
  });

  it("advances state machine and logs retry attempt records cleanly", () => {
    const mockCorrection: TargetedCorrection = {
      errorType: "grammar",
      priority: 2,
      patternKey: "past_simple_verb",
      whatToFix: "Thì Quá khứ đơn",
      userErroneousText: "go",
      minimalCorrection: "went",
      explanationVi: "Dùng went",
      betterSentence: "I went to work.",
    };

    let session = createRetrySession({
      originalTaskId: "test_task_1",
      sourceContext: "sentence_builder",
      originalPrompt: "Hôm qua tôi đi làm.",
      originalTranscript: "I go to work.",
      targetCorrection: mockCorrection,
    });

    expect(session.state).toBe("correction_presented");
    expect(session.currentAttemptNumber).toBe(1);

    // Record attempt
    session = recordRetryAttemptInSession(session, {
      spokenTranscript: "I went to work.",
      responseLatencyMs: 1200,
      speechDurationMs: 1800,
      evalResult: {
        isTargetErrorResolved: true,
        isMeaningMaintained: true,
        selfCorrectionDetected: false,
        newMajorErrorsIntroduced: false,
        overallRepairScore: 95,
        feedbackMessage: "Great job",
        repairedText: "I went to work.",
        isSuccessful: true,
        shouldEscalateSupport: false,
        canAdvance: true,
      },
      supportLevel: 1,
      modelPlaybackCount: 1,
    });

    expect(session.isResolved).toBe(true);
    expect(session.state).toBe("repair_success");
    expect(session.attempts.length).toBe(1);
    expect(session.currentAttemptNumber).toBe(2);
  });

  it("generates deterministic spoken repair challenge with 4-tier hints, vocab, and conversational trap", async () => {
    const challenge = await generateRepairChallenge({ provider: "mock" });
    expect(challenge.erroneousSentence).toBeDefined();
    expect(challenge.betterSentence).toBeDefined();
    expect(challenge.hints.length).toBe(5);
    expect(challenge.suggestedVocabulary.length).toBeGreaterThan(0);
    expect(challenge.conversationalTrap).toBeDefined();
    expect(challenge.conversationalTrap?.partnerUtterance).toContain("Wait");
  });

  it("aligns words with Needleman-Wunsch diff and marks repaired tokens", async () => {
    const { computeTokenAlignment } = await import("@/lib/foundation/retry-loop/token-alignment");

    const tokens = computeTokenAlignment({
      originalSentence: "Yesterday I go to the gym after work.",
      repairedSentence: "Yesterday, I went to the gym after work.",
      erroneousWord: "go",
      minimalCorrection: "went",
    });

    expect(tokens.length).toBeGreaterThan(0);
    const repairedToken = tokens.find((t) => t.text.includes("went"));
    expect(repairedToken).toBeDefined();
    expect(repairedToken?.status).toBe("repaired");
    expect(repairedToken?.isTargetFix).toBe(true);

    const unchangedToken = tokens.find((t) => t.text.includes("gym"));
    expect(unchangedToken?.status).toBe("unchanged");
  });

  it("detects mid-speech self-correction in real-time", async () => {
    const { detectMidSpeechSelfCorrection } = await import("@/lib/foundation/retry-loop/fast-pass-repair.service");

    // Slip and immediate self-correction
    expect(detectMidSpeechSelfCorrection("Yesterday I go went to the gym", "go", "went")).toBe(true);

    // Cue word self-correction
    expect(detectMidSpeechSelfCorrection("Yesterday I go sorry I went to the gym", "go", "went")).toBe(true);

    // No error slip, just correct sentence
    expect(detectMidSpeechSelfCorrection("Yesterday I went to the gym", "go", "went")).toBe(false);
  });

  it("evaluates correct speech instantly (<50ms) via Fast-Pass Repair Matcher", async () => {
    const { computeFastPassRepair } = await import("@/lib/foundation/retry-loop/fast-pass-repair.service");

    const mockCorrection: TargetedCorrection = {
      errorType: "grammar",
      priority: 2,
      patternKey: "past_simple_verb",
      whatToFix: "Thì Quá khứ đơn",
      userErroneousText: "go",
      minimalCorrection: "went",
      explanationVi: "Dùng went",
      betterSentence: "Yesterday, I went to the gym after work.",
      skeletonHint: "Yesterday, I ______ to the gym after work.",
    };

    const session = createRetrySession({
      originalTaskId: "test_task_1",
      sourceContext: "retry_lab",
      originalPrompt: "Hôm qua tôi đi tập gym.",
      originalTranscript: "Yesterday I go to the gym after work.",
      targetCorrection: mockCorrection,
    });

    // 1. Correct clean repair -> Fast Pass
    const fpResult = computeFastPassRepair(session, "Yesterday I went to the gym after work", {
      responseLatencyMs: 1100,
      speechDurationMs: 1800,
    });

    expect(fpResult.canFastPass).toBe(true);
    expect(fpResult.result).toBeDefined();
    expect(fpResult.result?.isFastPass).toBe(true);
    expect(fpResult.result?.isTargetErrorResolved).toBe(true);
    expect(fpResult.result?.overallRepairScore).toBeGreaterThanOrEqual(90);
    expect(fpResult.result?.diffTokens?.length).toBeGreaterThan(0);

    // 2. Erroneous attempt -> Bypasses Fast Pass
    const failResult = computeFastPassRepair(session, "Yesterday I go to sleep", {
      responseLatencyMs: 1100,
      speechDurationMs: 1800,
    });

    expect(failResult.canFastPass).toBe(false);
  });

  it("supports topic resolution in challenge generation", async () => {
    const challenge = await generateRepairChallenge({
      provider: "mock",
      topic: "travel",
    });

    expect(challenge).toBeDefined();
    expect(challenge.erroneousSentence).toBeDefined();
    expect(challenge.betterSentence).toBeDefined();
    expect(challenge.topic).toBeDefined();
  });

  it("manages endless session and calculates recovery summary in store", async () => {
    const { useRetryLoopStore } = await import("@/stores/retry-loop-store");
    const store = useRetryLoopStore.getState();

    // Set topic
    store.setSelectedTopic("workplace", "Họp báo cáo tiến độ");
    expect(useRetryLoopStore.getState().selectedTopicId).toBe("workplace");
    expect(useRetryLoopStore.getState().customTopicText).toBe("Họp báo cáo tiến độ");

    // Reset session
    store.resetSession();
    expect(useRetryLoopStore.getState().currentChallengeIndex).toBe(0);
    expect(useRetryLoopStore.getState().completedChallengesCount).toBe(0);

    // Simulate session history
    useRetryLoopStore.setState({
      sessionHistory: [
        {
          challengeTitle: "Thì Quá khứ đơn",
          originalSentence: "Yesterday I go late.",
          betterSentence: "Yesterday I went late.",
          isResolved: true,
          attemptsCount: 1,
          isSelfCorrection: false,
        },
        {
          challengeTitle: "Giới từ",
          originalSentence: "I arrive at airport.",
          betterSentence: "I arrived at the airport.",
          isResolved: true,
          attemptsCount: 2,
          isSelfCorrection: true,
        },
      ],
    });

    // Finish session manually
    useRetryLoopStore.getState().finishSessionManually();
    const summary = useRetryLoopStore.getState().sessionSummary;

    expect(summary).toBeDefined();
    expect(summary?.totalChallenges).toBe(2);
    expect(summary?.resolvedCount).toBe(2);
    expect(summary?.recoveryRate).toBe(100);
    expect(summary?.firstAttemptSuccessCount).toBe(1);
    expect(summary?.firstAttemptAccuracy).toBe(50);
    expect(summary?.selfCorrectionCount).toBe(1);
    expect(useRetryLoopStore.getState().isSessionCompleted).toBe(true);
  });
});


