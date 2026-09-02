// Personal Error Bank Service for Sentence Builder (Function 1)
// Tracks recurring spoken errors, frequency, severity, and prepares for Function 5 integration

import type { EvaluatedError, ErrorBankRecord, SentenceBuilderEvaluation } from "@/types/sentence-builder";

const STORAGE_KEY = "speaking_coach_error_bank_v1";

const PATTERN_LABEL_MAP: Record<string, { labelVi: string; category: ErrorBankRecord["category"] }> = {
  past_simple_regular: { labelVi: "Đuôi Quá khứ đơn -ed", category: "grammar" },
  past_simple_irregular: { labelVi: "Động từ bất quy tắc quá khứ (went/saw/bought)", category: "grammar" },
  present_simple_adverb: { labelVi: "Trạng từ tần suất (usually/always + V-bare)", category: "grammar" },
  article_a_an_the: { labelVi: "Mạo từ (a / an / the)", category: "grammar" },
  preposition_in_on_at: { labelVi: "Giới từ thời gian / nơi chốn", category: "grammar" },
  time_connectors: { labelVi: "Liên từ thời gian (before / after / when)", category: "sentence_structure" },
  complex_sentences_because: { labelVi: "Mệnh đề nguyên nhân (because / so)", category: "sentence_structure" },
  word_order: { labelVi: "Trật tự từ trong câu nói", category: "sentence_structure" },
  omission: { labelVi: "Thiếu thành phần chính trong câu", category: "sentence_structure" },
  vocabulary: { labelVi: "Từ vựng / Cụm diễn đạt chưa tự nhiên", category: "vocabulary" },
  general_grammar: { labelVi: "Ngữ pháp câu nói chung", category: "grammar" },
};

export function getStoredErrors(): ErrorBankRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export const getErrorBankRecords = getStoredErrors;

export function saveStoredErrors(errors: ErrorBankRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(errors.slice(0, 100)));
  } catch {}
}

export function recordErrorsFromEvaluation(evaluation: SentenceBuilderEvaluation): ErrorBankRecord[] {
  const currentRecords = getStoredErrors();
  const now = new Date().toISOString();

  evaluation.errors.forEach((err: EvaluatedError) => {
    const patternKey = err.patternKey || err.type || "general_grammar";
    const existingIdx = currentRecords.findIndex((r) => r.patternKey === patternKey);

    const meta = PATTERN_LABEL_MAP[patternKey] || {
      labelVi: err.explanation || "Lỗi cấu trúc câu",
      category: err.type === "vocabulary" ? "vocabulary" : "grammar",
    };

    if (existingIdx >= 0) {
      const existing = currentRecords[existingIdx];
      const errorCount = existing.errorCount + 1;
      const successCount = existing.successCount + (evaluation.isSuccessful ? 1 : 0);
      const total = errorCount + successCount;
      const accuracy = Math.round((successCount / total) * 100);

      // Determine trend
      let trend: ErrorBankRecord["trend"] = existing.trend;
      if (accuracy >= 70 && existing.accuracy < 70) trend = "improving";
      else if (accuracy < 50) trend = "needs_work";
      else trend = "stable";

      currentRecords[existingIdx] = {
        ...existing,
        errorCount,
        successCount,
        frequency: existing.frequency + 1,
        accuracy,
        trend,
        lastSeenAt: now,
        examples: [
          ...existing.examples.slice(-4),
          {
            userText: err.userText || evaluation.userTranscript,
            correction: err.correction || evaluation.betterVersion,
            timestamp: now,
          },
        ],
      };
    } else {
      currentRecords.push({
        id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        patternKey,
        category: meta.category,
        labelVi: meta.labelVi,
        description: err.explanation,
        frequency: 1,
        errorCount: 1,
        successCount: evaluation.isSuccessful ? 1 : 0,
        accuracy: evaluation.isSuccessful ? 50 : 0,
        trend: "needs_work",
        examples: [
          {
            userText: err.userText || evaluation.userTranscript,
            correction: err.correction || evaluation.betterVersion,
            timestamp: now,
          },
        ],
        firstSeenAt: now,
        lastSeenAt: now,
      });
    }
  });

  saveStoredErrors(currentRecords);
  return currentRecords;
}

export function getTopWeakness(): ErrorBankRecord | null {
  const records = getStoredErrors();
  if (records.length === 0) return null;
  // Sort by highest frequency and lowest accuracy
  const sorted = [...records].sort((a, b) => {
    if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
    return b.frequency - a.frequency;
  });
  return sorted[0] || null;
}
