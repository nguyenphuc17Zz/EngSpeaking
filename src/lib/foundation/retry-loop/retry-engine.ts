// Retry Engine Core — Function 3
// Reusable State Machine and Progress Controller for Spoken Repairs

import type {
  RetrySession,
  RetryAttemptRecord,
  TargetedCorrection,
  RepairEvaluationResult,
  RetryFSMState,
} from "@/types/retry-loop";

export interface CreateRetrySessionOptions {
  originalTaskId: string;
  sourceContext: "sentence_builder" | "vn_to_en" | "shadowing" | "conversation" | "retry_lab";
  originalPrompt: string;
  originalTranscript: string;
  targetCorrection: TargetedCorrection;
}

export function createRetrySession(options: CreateRetrySessionOptions): RetrySession {
  return {
    sessionId: `retry_sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    originalTaskId: options.originalTaskId,
    sourceContext: options.sourceContext,
    originalPrompt: options.originalPrompt,
    originalTranscript: options.originalTranscript,
    targetCorrection: options.targetCorrection,
    state: "correction_presented",
    currentAttemptNumber: 1,
    modelExposureCount: 0,
    attempts: [],
    isResolved: false,
    isSelfCorrected: false,
    isSimplified: false,
    totalRepairLatencyMs: 0,
    createdAt: new Date().toISOString(),
  };
}

export function recordRetryAttemptInSession(
  session: RetrySession,
  attempt: {
    spokenTranscript: string;
    responseLatencyMs: number;
    speechDurationMs: number;
    evalResult: RepairEvaluationResult;
    supportLevel: number;
    modelPlaybackCount: number;
  }
): RetrySession {
  const isResolved = attempt.evalResult.isSuccessful;
  const isSelfCorrected = attempt.evalResult.selfCorrectionDetected;

  const attemptRecord: RetryAttemptRecord = {
    attemptNumber: session.currentAttemptNumber,
    spokenTranscript: attempt.spokenTranscript,
    responseLatencyMs: attempt.responseLatencyMs,
    speechDurationMs: attempt.speechDurationMs,
    targetErrorResolved: attempt.evalResult.isTargetErrorResolved,
    meaningMaintained: attempt.evalResult.isMeaningMaintained,
    selfCorrectionDetected: isSelfCorrected,
    grammarScore: attempt.evalResult.overallRepairScore,
    overallScore: attempt.evalResult.overallRepairScore,
    supportLevel: attempt.supportLevel,
    modelPlaybackCount: attempt.modelPlaybackCount,
    timestamp: new Date().toISOString(),
  };

  let nextState: RetryFSMState = isResolved ? "repair_success" : "repair_failed";
  if (!isResolved && session.currentAttemptNumber >= 2) {
    nextState = "simplified_mode";
  }

  return {
    ...session,
    state: nextState,
    currentAttemptNumber: session.currentAttemptNumber + 1,
    attempts: [...session.attempts, attemptRecord],
    isResolved,
    isSelfCorrected,
    totalRepairLatencyMs: session.totalRepairLatencyMs + attempt.responseLatencyMs,
    completedAt: isResolved ? new Date().toISOString() : undefined,
  };
}
