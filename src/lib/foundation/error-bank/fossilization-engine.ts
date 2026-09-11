// L1 Vietnamese Interference & Interlanguage Fossilization Risk Engine
// Detects deeply rooted Vietnamese native language transfer patterns and quantifies fossilization risk (0 - 100).

import type { FossilizationLevel, L1InterferenceType, MainErrorCategory } from "@/types/error-bank";

export interface L1PatternRule {
  type: L1InterferenceType;
  titleVi: string;
  vietnameseHabitVi: string;
  naturalEnglishRuleVi: string;
  transferWeight: number; // 1.0 to 1.5 multiplier
  patternKeywords: string[];
}

export const L1_VIETNAMESE_PATTERNS: Record<L1InterferenceType, L1PatternRule> = {
  ending_sound_omission: {
    type: "ending_sound_omission",
    titleVi: "Nuốt âm đuôi và phụ âm cuối (/s/, /z/, /t/, /d/, -ed)",
    vietnameseHabitVi: "Tiếng Việt là ngôn ngữ đơn âm tiết khép, thói quen thả rơi âm gió và phụ âm chặn cuối.",
    naturalEnglishRuleVi: "Trong tiếng Anh, âm đuôi mang thông tin ngữ pháp cốt tử (số nhiều, chia thì, phân biệt từ).",
    transferWeight: 1.45,
    patternKeywords: ["ending_sound", "ending_consonant", "final_consonant", "sound_ed", "plural_s"],
  },
  tense_drop: {
    type: "tense_drop",
    titleVi: "Không biến đổi động từ quá khứ (Past Tense Drop)",
    vietnameseHabitVi: "Tiếng Việt diễn tả thời gian bằng phó từ ('hôm qua, đã, rồi') mà không cần đổi hình thái động từ.",
    naturalEnglishRuleVi: "Tiếng Anh bắt buộc biến đổi động từ sang dạng V2/ed khi diễn đạt hành động đã kết thúc.",
    transferWeight: 1.4,
    patternKeywords: ["past_simple", "past_tense", "v2", "irregular_verb", "yesterday"],
  },
  copula_drop: {
    type: "copula_drop",
    titleVi: "Bỏ quên trợ động từ hoặc To-Be trước tính từ ('She very pretty')",
    vietnameseHabitVi: "Trong ngữ pháp tiếng Việt, tính từ có thể trực tiếp làm vị ngữ mà không cần động từ liên kết.",
    naturalEnglishRuleVi: "Tiếng Anh luôn đòi hỏi động từ chính (To-Be) để liên kết chủ ngữ với tính từ vị ngữ.",
    transferWeight: 1.35,
    patternKeywords: ["copula", "to_be", "missing_is", "missing_are", "adjective_predicate"],
  },
  collocation_calque: {
    type: "collocation_calque",
    titleVi: "Dịch thô từng từ tiếng Việt (Word-by-word Calque / Chinglish)",
    vietnameseHabitVi: "Ghép từng từ đơn lẻ theo trật tự tư duy mẹ đẻ (ví dụ: 'open the light', 'make a party').",
    naturalEnglishRuleVi: "Sử dụng cụm từ kết hợp tự nhiên (Collocations): 'turn on the light', 'throw a party'.",
    transferWeight: 1.3,
    patternKeywords: ["collocation", "word_choice", "literal_translation", "calque", "direct_translation"],
  },
  preposition_calque: {
    type: "preposition_calque",
    titleVi: "Dịch nhầm giới từ theo nghĩa tiếng Việt ('marry with', 'angry with')",
    vietnameseHabitVi: "Dịch 'với' thành 'with', 'nghe anh ấy' thành 'listen him' do chiếu theo cấu trúc tiếng Việt.",
    naturalEnglishRuleVi: "Mỗi động từ tiếng Anh đi kèm giới từ cố định: 'married to', 'listen to him'.",
    transferWeight: 1.25,
    patternKeywords: ["preposition", "prep_with", "prep_for", "prep_in_on_at"],
  },
  plural_drop: {
    type: "plural_drop",
    titleVi: "Bỏ biến đổi danh từ số nhiều ('two book', 'many people')",
    vietnameseHabitVi: "Tiếng Việt dùng từ chỉ số lượng ('những, các, hai') và giữ nguyên danh từ.",
    naturalEnglishRuleVi: "Danh từ đếm được trong tiếng Anh bắt buộc thêm đuôi -s/-es khi ở dạng số nhiều.",
    transferWeight: 1.2,
    patternKeywords: ["plural", "noun_number", "singular_plural"],
  },
  filler_transfer: {
    type: "filler_transfer",
    titleVi: "Chêm từ đệm tư duy tiếng Việt ('à', 'ừm', 'thì là')",
    vietnameseHabitVi: "Phát ra âm đệm tiếng Việt khi não bộ đang dịch ngầm sang tiếng Anh.",
    naturalEnglishRuleVi: "Chuyển sang các cụm từ đệm bản ngữ: 'Well...', 'You know...', 'Let me see...'.",
    transferWeight: 1.15,
    patternKeywords: ["filler", "hesitation", "excessive_fillers", "vietnamese_filler"],
  },
};

/**
 * Detects whether an error key or description matches an L1 Vietnamese Interference pattern.
 */
export function detectL1Interference(
  patternKey: string,
  category: MainErrorCategory,
  userText?: string
): L1InterferenceType | undefined {
  const normalized = (patternKey + " " + (userText || "")).toLowerCase();

  for (const [type, rule] of Object.entries(L1_VIETNAMESE_PATTERNS)) {
    if (rule.patternKeywords.some((kw) => normalized.includes(kw))) {
      return type as L1InterferenceType;
    }
  }

  // Heuristic fallbacks by category
  if (category === "pronunciation") return "ending_sound_omission";
  if (normalized.includes("past") || normalized.includes("ago") || normalized.includes("yesterday")) return "tense_drop";
  if (category === "vocabulary") return "collocation_calque";

  return undefined;
}

export interface FossilizationAssessment {
  fossilizationScore: number; // 0 to 100
  fossilizationLevel: FossilizationLevel;
  l1Type?: L1InterferenceType;
  interventionStrategyVi: string;
}

/**
 * Computes Fossilization Risk Index (0 - 100) using repetition frequency,
 * recovery failure rate, L1 interference weighting, and spoken latency struggles.
 */
export function assessFossilizationRisk(params: {
  frequency: number;
  recoveryRate: number; // 0 - 100%
  patternKey: string;
  category: MainErrorCategory;
  averageLatencyMs?: number;
  userText?: string;
}): FossilizationAssessment {
  const l1Type = detectL1Interference(params.patternKey, params.category, params.userText);
  const l1Rule = l1Type ? L1_VIETNAMESE_PATTERNS[l1Type] : undefined;
  const l1Weight = l1Rule?.transferWeight ?? 1.0;

  // 1. Repetition frequency component (up to 40 points)
  const freqScore = Math.min(40, params.frequency * 6.5);

  // 2. Unrecovered error rate component (up to 35 points)
  const failureRate = Math.max(0, 100 - params.recoveryRate) / 100;
  const failureScore = failureRate * 35;

  // 3. Spoken latency / hesitation struggle (up to 15 points)
  const latency = params.averageLatencyMs ?? 2500;
  const latencyScore = latency > 3200 ? Math.min(15, ((latency - 3200) / 2500) * 15) : 0;

  // Base raw score (0 to 90)
  const rawScore = freqScore + failureScore + latencyScore;

  // Apply L1 Transfer multiplier (e.g. x1.45 for ending sound omission)
  const finalScore = Math.min(100, Math.round(rawScore * (0.8 + (l1Weight - 1.0) * 0.7)));

  let level: FossilizationLevel;
  let strategyVi: string;

  if (finalScore >= 65) {
    level = "fossilized";
    strategyVi = "Nguy cơ hóa đá cấu trúc cao! Cần chu trình cưỡng bức: Bật phản xạ dưới 2.0s tại Response Latency Gym và lặp lại tối thiểu 3 lần sửa tại Spoken Repair Lab.";
  } else if (finalScore >= 35) {
    level = "habitual";
    strategyVi = "Đang hình thành thói quen khẩu ngữ sai. Tăng tần suất mồi cụm từ chuẩn và ôn tập theo chu kỳ FSRS Spaced Repetition.";
  } else {
    level = "emerging";
    strategyVi = "Lỗi mới chớm xuất hiện. Nhắc nhở quy tắc chuẩn và cho học viên cơ hội tự sửa lỗi (Self-repair) ngay lập tức.";
  }

  return {
    fossilizationScore: finalScore,
    fossilizationLevel: level,
    l1Type,
    interventionStrategyVi: strategyVi,
  };
}
