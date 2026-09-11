// Toulmin Argumentation Model, Cognitive Pressure Blitz & Fallacy Detection Engine
// Specialized for Advanced Speaking Challenges (Phase 6 §55-56)

import type {
  ToulminAnalysis,
  ToulminElement,
  FallacyDetected,
  FallacyType,
  ComposureMetrics,
  TransitionalBridgeDetected,
  AdvancedTrainingType,
} from "@/types/advanced";

/**
 * Parses user speech for Toulmin Argumentation elements:
 * - Claim (Assertion / Thesis)
 * - Data (Evidence / Fact / Statistic)
 * - Warrant (Logical bridge explaining why Data supports Claim)
 * - Rebuttal (Anticipation / Refutation of counterarguments)
 * - Backing & Qualifier (Bonus nuances)
 */
export function analyzeToulminArgumentation(text: string): ToulminAnalysis {
  const clean = text.trim();
  if (!clean) {
    return {
      elementsFound: [],
      toulminScore: 0,
      feedbackVi: "Chưa có nội dung nói để phân tích lập luận.",
      missingKeyElements: ["claim", "data", "warrant", "rebuttal"],
    };
  }

  const elementsFound: ToulminElement[] = [];

  // 1. Claim Detection
  const claimRegex =
    /(?:i believe|i argue|in my view|my position is|the main point is|the primary reason is|we should|we must|it is clear that|there is no doubt that|it is essential to|i contend that|the truth is|my claim is|i would say that|is superior to|is vital for|plays a critical role|is not effective|cannot be ignored)/i;
  const claimMatch = clean.match(claimRegex);
  let claimSnippet: string | undefined;
  if (claimMatch) {
    elementsFound.push("claim");
    claimSnippet = extractSurroundingSnippet(clean, claimMatch.index ?? 0, 80);
  }

  // 2. Data / Evidence Detection
  const dataRegex =
    /(?:for example|for instance|such as|according to|statistics show|evidence suggests|research indicates|studies reveal|in fact|specifically|take the case of|as shown by|\b\d+%\b|\b\d+\s+percent\b|surveys demonstrate|data indicates|experiments show)/i;
  const dataMatch = clean.match(dataRegex);
  let dataSnippet: string | undefined;
  if (dataMatch) {
    elementsFound.push("data");
    dataSnippet = extractSurroundingSnippet(clean, dataMatch.index ?? 0, 80);
  }

  // 3. Warrant / Reasoning Detection
  const warrantRegex =
    /(?:because|therefore|since|this implies that|as a result|consequently|which means that|due to the fact that|this proves that|this demonstrates that|\bthus\b|\bhence\b|leads to the conclusion that|it follows that)/i;
  const warrantMatch = clean.match(warrantRegex);
  let warrantSnippet: string | undefined;
  if (warrantMatch) {
    elementsFound.push("warrant");
    warrantSnippet = extractSurroundingSnippet(clean, warrantMatch.index ?? 0, 80);
  }

  // 4. Rebuttal / Counterargument Awareness
  const rebuttalRegex =
    /(?:although|even though|while some might argue|on the other hand|critics may say|however|despite|nevertheless|opponents contend|admittedly|it could be argued that|one might counter that|in spite of)/i;
  const rebuttalMatch = clean.match(rebuttalRegex);
  let rebuttalSnippet: string | undefined;
  if (rebuttalMatch) {
    elementsFound.push("rebuttal");
    rebuttalSnippet = extractSurroundingSnippet(clean, rebuttalMatch.index ?? 0, 80);
  }

  // 5. Backing (Advanced Bonus)
  const backingRegex =
    /(?:based on the principle of|under the framework of|consistently proven across|well-documented theory|peer-reviewed|established law|standard economic model)/i;
  if (backingRegex.test(clean)) {
    elementsFound.push("backing");
  }

  // 6. Qualifier (Advanced Nuance Bonus)
  const qualifierRegex =
    /\b(?:probably|in most cases|largely|typically|generally|to a certain extent|in all likelihood|plausibly|presuming)\b/i;
  if (qualifierRegex.test(clean)) {
    elementsFound.push("qualifier");
  }

  // Calculate Missing Key Elements among the 4 pillars
  const corePillars: ToulminElement[] = ["claim", "data", "warrant", "rebuttal"];
  const missingKeyElements = corePillars.filter((p) => !elementsFound.includes(p));

  // Score Calculation (Core = 25 pts each, +5 bonus for backing/qualifier up to 100)
  let rawScore = 0;
  if (elementsFound.includes("claim")) rawScore += 25;
  if (elementsFound.includes("data")) rawScore += 25;
  if (elementsFound.includes("warrant")) rawScore += 25;
  if (elementsFound.includes("rebuttal")) rawScore += 25;
  if (elementsFound.includes("backing")) rawScore += 5;
  if (elementsFound.includes("qualifier")) rawScore += 5;

  const toulminScore = Math.min(100, rawScore);

  // Vietnamese Coaching Feedback Generation
  let feedbackVi = "";
  if (toulminScore === 100) {
    feedbackVi = "Xuất sắc! Lập luận đạt chuẩn Toulmin toàn diện 4 trụ cột: Luận điểm (Claim), Dẫn chứng (Data), Lý lẽ nối (Warrant) và Phản biện phòng ngừa (Rebuttal).";
  } else if (!elementsFound.includes("claim")) {
    feedbackVi = "Chưa nhận diện rõ Luận điểm cốt lõi (Claim). Hãy mở đầu bằng lập trường rõ ràng (ví dụ: 'In my view...', 'I strongly argue that...').";
  } else if (!elementsFound.includes("data")) {
    feedbackVi = "Thiếu Dẫn chứng xác thực (Data). Hãy đưa thêm ví dụ cụ thể hoặc số liệu ('For instance...', 'Statistics indicate...').";
  } else if (!elementsFound.includes("warrant")) {
    feedbackVi = "Thiếu Lý lẽ kết nối (Warrant). Hãy giải thích tại sao dẫn chứng lại củng cố luận điểm ('This implies that...', 'Consequently...').";
  } else if (!elementsFound.includes("rebuttal")) {
    feedbackVi = "Lập luận chắc chắn, nhưng cần thêm Phản biện phòng ngừa (Rebuttal) ('While critics argue..., however...') để đạt đẳng cấp C1/C2.";
  } else {
    feedbackVi = `Đã xây dựng được ${elementsFound.length} thành tố Toulmin (${elementsFound.join(", ")}). Tiếp tục phát huy!`;
  }

  return {
    elementsFound,
    claimSnippet,
    dataSnippet,
    warrantSnippet,
    rebuttalSnippet,
    toulminScore,
    feedbackVi,
    missingKeyElements,
  };
}

/**
 * Detects common cognitive and logical fallacies in learner's debate or persuasion response
 */
export function detectLogicalFallacies(text: string): FallacyDetected[] {
  const clean = text.trim();
  if (!clean) return [];

  const detected: FallacyDetected[] = [];

  // 1. False Dilemma / Black-and-White Dichotomy
  const falseDilemmaMatch = clean.match(
    /\b(either\b.+?\bor\b|only two (?:options|choices|ways)|you are either with us or against us|black and white)\b/i
  );
  if (falseDilemmaMatch) {
    detected.push({
      type: "false_dilemma",
      labelVi: "Ngụy biện Nhị nguyên (False Dilemma)",
      snippet: extractSurroundingSnippet(clean, falseDilemmaMatch.index ?? 0, 70),
      explanationVi: "Quy chụp chỉ có 2 thái cực đối lập mà bỏ qua các giải pháp trung gian đa chiều.",
      severity: "warning",
    });
  }

  // 2. Hasty Generalization
  const hastyGenMatch = clean.match(
    /\b(everyone knows that|nobody ever|always happens|all people (?:are|do)|every single person|without exception, everyone)\b/i
  );
  if (hastyGenMatch) {
    detected.push({
      type: "hasty_generalization",
      labelVi: "Khái quát hóa vội vã (Hasty Generalization)",
      snippet: extractSurroundingSnippet(clean, hastyGenMatch.index ?? 0, 70),
      explanationVi: "Tuyệt đối hóa nhận định khi chưa có đủ mẫu thử hoặc dẫn chứng đại diện.",
      severity: "warning",
    });
  }

  // 3. Circular Reasoning / Tautology
  const circularMatch = clean.match(
    /\b(is true because it is true|works because it works|it is correct because it is right|because that is what it is)\b/i
  );
  if (circularMatch) {
    detected.push({
      type: "circular_reasoning",
      labelVi: "Lập luận luẩn quẩn (Circular Reasoning)",
      snippet: extractSurroundingSnippet(clean, circularMatch.index ?? 0, 70),
      explanationVi: "Sử dụng chính luận điểm làm bằng chứng để tự chứng minh cho bản thân.",
      severity: "critical",
    });
  }

  // 4. Ad Hominem
  const adHominemMatch = clean.match(
    /\b(you only say that because you are|anyone who thinks that is (?:stupid|foolish|dumb|naive|insane)|you are too (?:young|ignorant) to understand)\b/i
  );
  if (adHominemMatch) {
    detected.push({
      type: "ad_hominem",
      labelVi: "Công kích cá nhân (Ad Hominem)",
      snippet: extractSurroundingSnippet(clean, adHominemMatch.index ?? 0, 70),
      explanationVi: "Tấn công tư cách cá nhân đối phương thay vì tập trung phản biện lập luận chuyên môn.",
      severity: "critical",
    });
  }

  // 5. Straw Man
  const strawmanMatch = clean.match(
    /\b(so you(?:'re| are) saying (?:that )?we should just destroy|so basically you want to ignore all|you want everyone to suffer)\b/i
  );
  if (strawmanMatch) {
    detected.push({
      type: "strawman",
      labelVi: "Bù nhìn rơm (Straw Man)",
      snippet: extractSurroundingSnippet(clean, strawmanMatch.index ?? 0, 70),
      explanationVi: "Bóp méo hoặc thổi phồng luận điểm đối phương thành thái cực tiêu cực để dễ bác bỏ.",
      severity: "warning",
    });
  }

  // 6. Slippery Slope
  const slipperySlopeMatch = clean.match(
    /\b(if we allow this,?.+?then inevitably|will lead directly to the total (?:collapse|destruction|ruin)|will end civilization)\b/i
  );
  if (slipperySlopeMatch) {
    detected.push({
      type: "slippery_slope",
      labelVi: "Bờ dốc trơn trượt (Slippery Slope)",
      snippet: extractSurroundingSnippet(clean, slipperySlopeMatch.index ?? 0, 70),
      explanationVi: "Vẽ ra viễn cảnh sụp đổ dây chuyền mà không chứng minh được chuỗi nhân quả tất yếu.",
      severity: "warning",
    });
  }

  return detected;
}

/**
 * Calculates Composure Metrics and Resilience Grade (S/A/B/C) under time pressure
 */
export function calculateComposureMetrics(opts: {
  latencyMs: number;
  timeLimitMs: number;
  wpm: number;
  hesitationCount: number;
}): ComposureMetrics {
  const { latencyMs, timeLimitMs, wpm, hesitationCount } = opts;
  const safeTimeLimit = Math.max(1000, timeLimitMs);
  const pressureRatio = Number((latencyMs / safeTimeLimit).toFixed(2));

  let score = 100;

  // 1. Latency under blitz limit evaluation
  if (latencyMs > safeTimeLimit) {
    const overdueRatio = (latencyMs - safeTimeLimit) / safeTimeLimit;
    const latencyPenalty = Math.min(45, overdueRatio * 50);
    score -= latencyPenalty;
  } else {
    // Quick prompt reaction bonus (within 60% of limit)
    if (latencyMs <= safeTimeLimit * 0.6) {
      score += 5;
    }
  }

  // 2. Speaking Rate (WPM) Stability
  // Ideal executive speaking rate: 110 - 165 WPM
  if (wpm > 0 && wpm < 90) {
    score -= (90 - wpm) * 0.3; // Hesitant / sluggish
  } else if (wpm > 200) {
    score -= (wpm - 200) * 0.25; // Rushed / flustered
  }

  // 3. Hesitations and filler word penalties
  score -= Math.min(25, hesitationCount * 4);

  // Clamp score
  const finalScore = Math.max(15, Math.min(100, Math.round(score)));

  // Assign Grade
  let grade: "S" | "A" | "B" | "C";
  let label: string;

  if (finalScore >= 90) {
    grade = "S";
    label = "Bản Lĩnh Đỉnh Cao (Unshakeable Composure)";
  } else if (finalScore >= 75) {
    grade = "A";
    label = "Điềm Tĩnh & Quyết Đoán (Poised & Decisive)";
  } else if (finalScore >= 60) {
    grade = "B";
    label = "Khá Vững Vàng (Stable Under Pressure)";
  } else {
    grade = "C";
    label = "Cần Thêm Áp Lực Thử Thách (Needs Drill)";
  }

  return {
    score: finalScore,
    grade,
    latencyMs,
    timeLimitMs: safeTimeLimit,
    pressureRatio,
    wpm,
    hesitationCount,
    label,
  };
}

/**
 * Detects Executive Transitional Bridging strategies
 * Essential for Q&A, Press conferences, and executive negotiations
 */
export function detectTransitionalBridging(text: string): TransitionalBridgeDetected {
  const clean = text.trim();
  if (!clean) {
    return {
      hasBridge: false,
      feedbackVi: "Chưa có nội dung chuyển tiếp.",
    };
  }

  const bridgePatterns = [
    { pattern: /(?:that brings up an important point|that's a critical point)/i, phrase: "That brings up an important point" },
    { pattern: /(?:while i understand that perspective|while i respect that view)/i, phrase: "While I understand that perspective" },
    { pattern: /(?:building on what you said|adding to your thought)/i, phrase: "Building on what you said" },
    { pattern: /(?:that ties directly into|this connects directly to)/i, phrase: "That ties directly into" },
    { pattern: /(?:speaking of which|on that specific note)/i, phrase: "Speaking of which" },
    { pattern: /(?:to pivot to the root issue|shifting our focus to the core)/i, phrase: "To pivot to the root issue" },
    { pattern: /(?:what really matters here is|the fundamental priority is)/i, phrase: "What really matters here is" },
    { pattern: /(?:before answering that, let me clarify|to put that into context)/i, phrase: "To put that into context" },
  ];

  for (const item of bridgePatterns) {
    if (item.pattern.test(clean)) {
      return {
        hasBridge: true,
        bridgePhrase: item.phrase,
        feedbackVi: `Xuất sắc! Sử dụng kỹ thuật chuyển tiếp (Bridging): "${item.phrase}" giúp kiểm soát nhịp điệu cuộc hội thoại.`,
      };
    }
  }

  return {
    hasBridge: false,
    feedbackVi: "Chưa sử dụng kỹ thuật Bridging chuyển hướng đối thoại chuyên nghiệp.",
  };
}

/**
 * Returns default blitz time limit in seconds according to training block type
 */
export function getDefaultBlitzLimitSec(blockType?: AdvancedTrainingType | string): number {
  switch (blockType) {
    case "rapidResponse":
      return 3;
    case "pressureConversation":
    case "highPressure":
    case "escalation":
      return 5;
    case "unexpectedQuestion":
    case "qaChallenge":
    case "topicSwitching":
      return 5;
    case "debate":
    case "persuasion":
    case "negotiation":
      return 6;
    case "longForm":
    case "presentation":
    case "storytelling":
      return 10;
    default:
      return 8;
  }
}

/**
 * Helper to extract snippet around matched index
 */
function extractSurroundingSnippet(text: string, index: number, maxLen: number): string {
  const start = Math.max(0, index - 10);
  const end = Math.min(text.length, index + maxLen);
  let snippet = text.slice(start, end).trim();
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";
  return snippet;
}
