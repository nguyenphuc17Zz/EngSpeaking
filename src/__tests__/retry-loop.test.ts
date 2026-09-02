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

  it("generates deterministic spoken repair challenge with 4-tier hints and vocab", async () => {
    const challenge = await generateRepairChallenge({ provider: "mock" });
    expect(challenge.erroneousSentence).toBeDefined();
    expect(challenge.betterSentence).toBeDefined();
    expect(challenge.hints.length).toBe(5);
    expect(challenge.suggestedVocabulary.length).toBeGreaterThan(0);
  });
});
