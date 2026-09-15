// Wrapper: maps conversation turn pedagogy errors into unified MasterErrorBank
// occurrences via normalize-batch.service (single source of truth).

import { normalizeEvaluatedErrors } from "@/lib/foundation/error-bank/normalize-batch.service";
import { ingestEvaluatedErrors } from "@/lib/foundation/error-bank/error-bank.service";
import type { TurnPedagogy } from "@/types/conversation";

export function ingestTurnErrorsToBank(params: {
  pedagogy?: TurnPedagogy | null;
  userTranscript: string;
  contextSentence?: string;
  latencyMs?: number;
  wasRetried?: boolean;
  retrySucceeded?: boolean;
}) {
  const errors = params.pedagogy?.errors || [];
  // Also convert legacy grammarIssue/grammarFix into a normalized error
  const legacy =
    params.pedagogy?.grammarIssue && params.pedagogy?.grammarFix
      ? [
          {
            type: "grammar",
            severity: "minor" as const,
            userText: params.userTranscript,
            correction: params.pedagogy.grammarFix,
            explanation: params.pedagogy.grammarIssue,
            patternKey: "conversation_grammar_slip",
          },
        ]
      : [];
  const all = [...errors, ...legacy];
  if (all.length === 0) return [];

  const occurrences = normalizeEvaluatedErrors(all, {
    fallbackUserTranscript: params.userTranscript,
    fallbackCorrection: params.pedagogy?.nativeReformulation || params.userTranscript,
    contextSentence: params.contextSentence,
    latencyMs: params.latencyMs ?? params.pedagogy?.latencyMs ?? 2500,
    communicativelyValid: (params.pedagogy?.turnScore ?? 75) >= 65,
    wpm: params.pedagogy?.hesitationMetrics?.wpm ?? params.pedagogy?.speechRateWpm,
  });
  if (occurrences.length === 0) return [];
  return ingestEvaluatedErrors(occurrences, {
    sourceModule: "conversation",
    responseLatencyMs: params.latencyMs ?? params.pedagogy?.latencyMs,
    wasRetried: params.wasRetried,
    retrySucceeded: params.retrySucceeded ?? (params.pedagogy?.turnScore ?? 0) >= 70,
  });
}
