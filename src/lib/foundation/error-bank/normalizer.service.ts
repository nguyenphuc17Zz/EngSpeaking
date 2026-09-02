// Error Normalization Service — Function 5
// Semantic pattern normalization & Gap Type determination

import { generateTextWithRouting } from "@/lib/ai";
import { normalizedErrorSchema } from "@/lib/validation/error-bank-schemas";
import { ERROR_NORMALIZER_SYSTEM, buildErrorNormalizerUserPrompt } from "@/lib/ai/prompts/error-bank-prompts";
import type { MainErrorCategory, GapType, ErrorSeverity } from "@/types/error-bank";

export interface NormalizedErrorResult {
  patternKey: string;
  canonicalName: string;
  category: MainErrorCategory;
  subCategory?: string;
  labelVi: string;
  descriptionVi: string;
  severity: ErrorSeverity;
  gapType: GapType;
  confidenceScore: number;
  explanationVi: string;
}

const DETERMINISTIC_PATTERN_MAP: Record<
  string,
  {
    category: MainErrorCategory;
    canonicalName: string;
    labelVi: string;
    descriptionVi: string;
    severity: ErrorSeverity;
    gapType: GapType;
  }
> = {
  past_simple: {
    category: "grammar",
    canonicalName: "Past Simple Tense Retrieval",
    labelVi: "Động từ quá khứ đơn (went / saw / ate)",
    descriptionVi: "Dùng nhầm động từ nguyên mẫu khi diễn tả sự việc đã kết thúc trong quá khứ.",
    severity: "major",
    gapType: "retrieval_gap",
  },
  past_simple_base_form: {
    category: "grammar",
    canonicalName: "Past Simple base form used instead of V2",
    labelVi: "Thiếu dạng quá khứ của động từ",
    descriptionVi: "Cần đổi động từ sang dạng V2/ed (ví dụ: go → went).",
    severity: "major",
    gapType: "retrieval_gap",
  },
  articles: {
    category: "grammar",
    canonicalName: "Article (A / An / The) Omission or Misuse",
    labelVi: "Mạo từ (a / an / the)",
    descriptionVi: "Thiếu hoặc dùng nhầm mạo từ trước danh từ đếm được số ít.",
    severity: "minor",
    gapType: "knowledge_gap",
  },
  prepositions: {
    category: "grammar",
    canonicalName: "Preposition Usage (in/on/at/for/with)",
    labelVi: "Giới từ thời gian / nơi chốn",
    descriptionVi: "Dùng nhầm giới từ đi kèm địa điểm hoặc mốc thời gian.",
    severity: "moderate",
    gapType: "knowledge_gap",
  },
  collocation: {
    category: "vocabulary",
    canonicalName: "Collocation & Phrasing",
    labelVi: "Cụm từ kết hợp tự nhiên (Collocations)",
    descriptionVi: "Dịch thô từ tiếng Việt khiến cách kết hợp từ chưa tự nhiên.",
    severity: "moderate",
    gapType: "production_gap",
  },
  word_choice: {
    category: "vocabulary",
    canonicalName: "Inappropriate Word Choice",
    labelVi: "Lựa chọn từ vựng theo ngữ cảnh",
    descriptionVi: "Từ vựng dùng chưa hoàn toàn chuẩn xác trong ngữ cảnh khẩu ngữ.",
    severity: "moderate",
    gapType: "knowledge_gap",
  },
  word_stress: {
    category: "pronunciation",
    canonicalName: "Word Stress Placement",
    labelVi: "Trọng âm từ vựng",
    descriptionVi: "Nhấn sai âm tiết chính khiến người nghe khó nhận diện từ.",
    severity: "moderate",
    gapType: "pronunciation_gap",
  },
  ending_sound: {
    category: "pronunciation",
    canonicalName: "Ending Consonant Sound",
    labelVi: "Âm đuôi (Ending Sounds: /s/, /t/, /d/, /ed/)",
    descriptionVi: "Nuốt hoặc bỏ quên âm đuôi khi phát âm từ tiếng Anh.",
    severity: "major",
    gapType: "pronunciation_gap",
  },
  retrieval_delay: {
    category: "fluency",
    canonicalName: "Spoken Response Latency Delay",
    labelVi: "Độ trễ truy xuất khẩu ngữ (>3.5s)",
    descriptionVi: "Mất nhiều thời gian suy nghĩ cấu trúc trước khi bắt đầu nói.",
    severity: "moderate",
    gapType: "retrieval_gap",
  },
  excessive_fillers: {
    category: "fluency",
    canonicalName: "Excessive Filler Dependency",
    labelVi: "Lạm dụng từ đệm (um, uh, like)",
    descriptionVi: "Chêm quá nhiều từ đệm trong lúc tìm ý diễn đạt.",
    severity: "minor",
    gapType: "production_gap",
  },
};

function cleanJson(text: string): unknown {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    return JSON.parse(withoutFence);
  } catch {
    const m = withoutFence.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {}
    }
    return null;
  }
}

export async function normalizeErrorPattern(params: {
  userSpokenText: string;
  expectedCorrection: string;
  contextSentence?: string;
  responseLatencyMs?: number;
  existingPatterns?: string[];
  provider?: string;
  model?: string;
}): Promise<NormalizedErrorResult> {
  const provider = params.provider || "gemini";
  const model = params.model || "auto";

  // Check deterministic keywords first
  const lowerUser = params.userSpokenText.toLowerCase();
  const lowerCorr = params.expectedCorrection.toLowerCase();

  if (
    (lowerUser.includes("yesterday") || lowerUser.includes("last week") || lowerUser.includes("ago")) &&
    (lowerCorr.includes("went") || lowerCorr.includes("saw") || lowerCorr.includes("had") || lowerCorr.includes("bought"))
  ) {
    const d = DETERMINISTIC_PATTERN_MAP.past_simple_base_form;
    return {
      patternKey: "past_simple_base_form",
      canonicalName: d.canonicalName,
      category: d.category,
      labelVi: d.labelVi,
      descriptionVi: d.descriptionVi,
      severity: d.severity,
      gapType: (params.responseLatencyMs ?? 0) > 3500 ? "retrieval_gap" : "production_gap",
      confidenceScore: 0.98,
      explanationVi: "Dùng nhầm động từ nguyên mẫu cho hành động quá khứ.",
    };
  }

  if (provider === "mock") {
    const d = DETERMINISTIC_PATTERN_MAP.past_simple;
    return {
      patternKey: "past_simple",
      canonicalName: d.canonicalName,
      category: d.category,
      labelVi: d.labelVi,
      descriptionVi: d.descriptionVi,
      severity: d.severity,
      gapType: d.gapType,
      confidenceScore: 0.9,
      explanationVi: d.descriptionVi,
    };
  }

  const userPrompt = buildErrorNormalizerUserPrompt(params);

  try {
    const res = await generateTextWithRouting({
      provider,
      model,
      input: {
        messages: [{ role: "user", content: userPrompt }],
        systemInstruction: ERROR_NORMALIZER_SYSTEM,
        temperature: 0.2,
        maxOutputTokens: 500,
      },
    });

    const parsed = cleanJson(res.text);
    if (!parsed) throw new Error("Could not parse JSON from Error Normalizer");

    const validated = normalizedErrorSchema.safeParse(parsed);
    if (!validated.success) {
      throw new Error("Invalid normalized error schema");
    }

    return validated.data as NormalizedErrorResult;
  } catch {
    const fallback = DETERMINISTIC_PATTERN_MAP.collocation;
    return {
      patternKey: "collocation",
      canonicalName: fallback.canonicalName,
      category: fallback.category,
      labelVi: fallback.labelVi,
      descriptionVi: fallback.descriptionVi,
      severity: fallback.severity,
      gapType: fallback.gapType,
      confidenceScore: 0.85,
      explanationVi: fallback.descriptionVi,
    };
  }
}
