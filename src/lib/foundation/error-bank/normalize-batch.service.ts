// Unified batch normalizer: maps SB/VN-EN/Survival/Retry evaluated errors
// into canonical MasterErrorBank occurrences (single source of truth).
// Replaces ad-hoc manual mapping scattered across stores.

import type { MainErrorCategory, GapType, ErrorSeverity } from "@/types/error-bank";

export interface RawEvaluatedError {
  type: string;
  severity?: string;
  userText?: string;
  correction?: string;
  explanation?: string;
  patternKey?: string;
}

export interface NormalizedOccurrence {
  patternKey: string;
  canonicalName: string;
  category: MainErrorCategory;
  labelVi: string;
  descriptionVi: string;
  severity: ErrorSeverity;
  gapType: GapType;
  confidenceScore: number;
  userText: string;
  correction: string;
  contextSentence?: string;
}

const CATEGORY_FALLBACK: Record<string, MainErrorCategory> = {
  grammar: "grammar",
  article: "grammar",
  preposition: "grammar",
  word_order: "grammar",
  vocabulary: "vocabulary",
  taboo: "vocabulary",
  collocation: "vocabulary",
  pronunciation: "pronunciation",
  naturalness: "vocabulary",
  omission: "grammar",
  strategy: "fluency",
  fluency: "fluency",
};

function toSeverity(s?: string): ErrorSeverity {
  if (s === "minor" || s === "moderate" || s === "major" || s === "critical") return s;
  return "moderate";
}

function inferGapType(params: {
  errorType: string;
  latencyMs: number;
  communicativelyValid: boolean;
  patternKey: string;
}): GapType {
  const { errorType, latencyMs, communicativelyValid, patternKey } = params;
  if (errorType === "pronunciation") return "pronunciation_gap";
  if (patternKey === "taboo_slip") return "production_gap";
  if (patternKey === "missing_genus" || patternKey === "missing_differentia") return "retrieval_gap";
  if (latencyMs > 3500 && communicativelyValid) return "retrieval_gap";
  if (!communicativelyValid) return "knowledge_gap";
  return "production_gap";
}

export function normalizeEvaluatedErrors(
  errors: RawEvaluatedError[] | undefined,
  opts: {
    fallbackUserTranscript: string;
    fallbackCorrection: string;
    contextSentence?: string;
    latencyMs?: number;
    communicativelyValid?: boolean;
    wpm?: number;
  }
): NormalizedOccurrence[] {
  const list = errors || [];
  const latencyMs = opts.latencyMs ?? 2500;
  const communicativelyValid = opts.communicativelyValid ?? true;

  const normalized: NormalizedOccurrence[] = list.map((e) => {
    const type = (e.type || "grammar").toLowerCase();
    const patternKey = e.patternKey || (type === "taboo" ? "taboo_slip" : `general_${type}`);
    const category = CATEGORY_FALLBACK[type] || "grammar";
    return {
      patternKey,
      canonicalName: e.correction || opts.fallbackCorrection || patternKey,
      category,
      labelVi: e.explanation || "Lỗi cấu trúc khẩu ngữ",
      descriptionVi: e.explanation || "Cần lưu ý dạng chuẩn xác khi nói.",
      severity: toSeverity(e.severity),
      gapType: inferGapType({ errorType: type, latencyMs, communicativelyValid, patternKey }),
      confidenceScore: 0.9,
      userText: e.userText || opts.fallbackUserTranscript,
      correction: e.correction || opts.fallbackCorrection,
      contextSentence: opts.contextSentence,
    };
  });

  // Hesitation-derived fluency occurrence (aligned with SB/VN-EN/Survival WPM logic)
  if ((opts.wpm ?? 120) < 75 && latencyMs > 3000) {
    normalized.push({
      patternKey: "retrieval_delay",
      canonicalName: "Spoken Response Latency Delay",
      category: "fluency",
      labelVi: "Độ trễ truy xuất khẩu ngữ (>3.5s)",
      descriptionVi: "Mất nhiều thời gian suy nghĩ cấu trúc trước khi bắt đầu nói.",
      severity: "moderate",
      gapType: "retrieval_gap",
      confidenceScore: 0.8,
      userText: opts.fallbackUserTranscript,
      correction: opts.fallbackCorrection,
      contextSentence: opts.contextSentence,
    });
  }

  return normalized;
}
