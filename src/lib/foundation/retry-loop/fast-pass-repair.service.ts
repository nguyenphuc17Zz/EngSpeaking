// Fast-Pass Repair Matcher (<50ms) & Mid-Speech Self-Correction Engine
// Client-side instant evaluation for Spoken Repair Lab (Function 4)

import type { RetrySession, RepairEvaluationResult } from "@/types/retry-loop";
import { computeTokenAlignment } from "./token-alignment";

const CONTRACTION_MAP: Record<string, string> = {
  "don't": "do not",
  "doesn't": "does not",
  "didn't": "did not",
  "won't": "will not",
  "can't": "cannot",
  "couldn't": "could not",
  "shouldn't": "should not",
  "wouldn't": "would not",
  "isn't": "is not",
  "aren't": "are not",
  "wasn't": "was not",
  "weren't": "were not",
  "i'm": "i am",
  "you're": "you are",
  "we're": "we are",
  "they're": "they are",
  "he's": "he is",
  "she's": "she is",
  "it's": "it is",
  "wanna": "want to",
  "gonna": "going to",
  "gotta": "got to",
};

export function normalizeSpokenText(text: string): string {
  let s = text.toLowerCase().trim();
  s = s.replace(/[\u2018\u2019]/g, "'");
  for (const [k, v] of Object.entries(CONTRACTION_MAP)) {
    const re = new RegExp(`\\b${k}\\b`, "gi");
    s = s.replace(re, v);
  }
  return s.replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Detects Mid-Utterance Self-Correction (Perceptual Loop Theory):
 * The user slipped up, detected their own error, and corrected it mid-sentence.
 * e.g., "Yesterday I go... went to the gym" or "I saw three mans... men".
 */
export function detectMidSpeechSelfCorrection(
  rawTranscript: string,
  erroneousWord: string,
  targetFix: string
): boolean {
  const norm = normalizeSpokenText(rawTranscript);
  const normErr = normalizeSpokenText(erroneousWord);
  const normFix = normalizeSpokenText(targetFix);

  if (!normFix || norm.length < 4) return false;

  // Pattern A: Cue phrases ("sorry", "i mean", "wait", "no", "uh i mean")
  const cues = ["sorry", "i mean", "wait", "no", "uh i mean", "excuse me", "or rather", "ah no"];
  const hasCue = cues.some((c) => norm.includes(c));

  if (hasCue && norm.includes(normFix)) {
    return true;
  }

  // Pattern B: Immediate adjacent/near repair: "erroneousWord ... targetFix"
  if (normErr && norm.includes(normErr) && norm.includes(normFix)) {
    const errIdx = norm.indexOf(normErr);
    const fixIdx = norm.lastIndexOf(normFix);
    // target fix must appear AFTER the erroneous word
    if (fixIdx > errIdx) {
      return true;
    }
  }

  return false;
}

export interface FastPassRepairOptions {
  responseLatencyMs?: number;
  speechDurationMs?: number;
  attemptNumber?: number;
}

/**
 * Tier-1 Fast-Pass Repair Matcher (<50ms).
 * Evaluates spoken repair attempts locally without sending network requests to LLM.
 */
export function computeFastPassRepair(
  session: RetrySession,
  spokenTranscript: string,
  opts: FastPassRepairOptions = {}
): { canFastPass: boolean; result?: RepairEvaluationResult } {
  if (!spokenTranscript || spokenTranscript.trim().length < 2) {
    return { canFastPass: false };
  }

  const correction = session.targetCorrection;
  const targetFix = correction.minimalCorrection;
  const erroneousWord = correction.userErroneousText;
  const betterSentence = correction.betterSentence;

  const cleanSpoken = normalizeSpokenText(spokenTranscript);
  const cleanFix = normalizeSpokenText(targetFix);
  const cleanErr = normalizeSpokenText(erroneousWord);
  const cleanBetter = normalizeSpokenText(betterSentence);

  // 1. Check for Mid-Speech Self Correction
  const isMidSpeech = detectMidSpeechSelfCorrection(spokenTranscript, erroneousWord, targetFix);

  // 2. Check if target fix is resolved
  let isTargetErrorResolved = false;
  if (cleanFix && cleanSpoken.includes(cleanFix)) {
    // If erroneous word is absent OR superseded by mid-speech self-correction
    if (!cleanErr || !cleanSpoken.includes(cleanErr) || isMidSpeech) {
      isTargetErrorResolved = true;
    }
  }

  // 3. Sentence similarity & coverage check against betterSentence
  const betterWords = cleanBetter.split(" ").filter((w) => w.length > 2);
  const spokenWords = cleanSpoken.split(" ").filter((w) => w.length > 2);

  let matchWordCount = 0;
  betterWords.forEach((bw) => {
    if (spokenWords.includes(bw)) matchWordCount++;
  });

  const overlapRatio = betterWords.length > 0 ? matchWordCount / betterWords.length : 1;

  // Direct match with betterSentence or simplifiedSentence
  const isDirectSentenceMatch =
    cleanSpoken === cleanBetter ||
    cleanSpoken.includes(cleanBetter) ||
    cleanBetter.includes(cleanSpoken) ||
    (correction.simplifiedSentence && cleanSpoken.includes(normalizeSpokenText(correction.simplifiedSentence)));

  // If error is resolved and sentence is structurally coherent
  if ((isTargetErrorResolved && (overlapRatio >= 0.6 || isDirectSentenceMatch)) || (isMidSpeech && overlapRatio >= 0.5)) {
    const diffTokens = computeTokenAlignment({
      originalSentence: session.originalTranscript,
      repairedSentence: spokenTranscript,
      erroneousWord,
      minimalCorrection: targetFix,
    });

    const overallRepairScore = isMidSpeech ? 100 : isDirectSentenceMatch ? 95 : 90;

    let feedbackMessage = `Xuất sắc! Bạn đã sửa chuẩn xác từ "${targetFix}" và hoàn thiện câu trôi chảy.`;
    if (isMidSpeech) {
      feedbackMessage = `🎉 Tuyệt vời! Bạn đã kích hoạt phản xạ tự sửa ngay giữa câu (Mid-Speech Self-Correction) — Bonus +100 điểm!`;
    }

    const result: RepairEvaluationResult = {
      isTargetErrorResolved: true,
      isMeaningMaintained: true,
      selfCorrectionDetected: isMidSpeech,
      newMajorErrorsIntroduced: false,
      overallRepairScore,
      feedbackMessage,
      repairedText: spokenTranscript,
      isSuccessful: true,
      shouldEscalateSupport: false,
      canAdvance: true,
      isFastPass: true,
      isMidSpeechSelfCorrection: isMidSpeech,
      diffTokens,
    };

    return { canFastPass: true, result };
  }

  return { canFastPass: false };
}
