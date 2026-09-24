// Aristotelian Semantic Field & Listener Guessing Engine for Survival Speaking (Function 7)
// Evaluates Circumlocution descriptions using classical Definition Paradigm:
// Genus Proximum (Hypernym / Category) + Differentia Specifica (Distinguishing Functions)

import type { CircumlocutionTask } from "@/types/survival-speaking";

export interface AristotelianAnalysis {
  tabooViolated: boolean;
  violatedWord?: string;
  genusDetected: boolean;
  genusMatchPhrase?: string;
  genusScore: number; // 0-100
  differentiaDetected: boolean;
  anchorsHit: string[];
  anchorsMissed: string[];
  functionScore: number; // 0-100
  semanticPrecisionScore: number; // 0-100
  listenerGuess: string;
  pedagogicalFeedbackVi: string;
}

/**
 * Generates natural morphological variations for taboo words
 */
export function generateTabooVariations(baseWord: string): string[] {
  const clean = baseWord.toLowerCase().trim();
  if (!clean) return [];

  const variations = new Set<string>([clean]);
  
  // Plurals
  if (clean.endsWith("y") && !/[aeiou]y$/.test(clean)) {
    variations.add(clean.slice(0, -1) + "ies");
  } else if (clean.endsWith("s") || clean.endsWith("sh") || clean.endsWith("ch") || clean.endsWith("x") || clean.endsWith("z")) {
    variations.add(clean + "es");
  } else {
    variations.add(clean + "s");
  }

  // Verb inflections (-ed, -ing)
  if (clean.endsWith("e")) {
    variations.add(clean + "d");
    variations.add(clean.slice(0, -1) + "ing");
  } else {
    variations.add(clean + "ed");
    variations.add(clean + "ing");
  }

  return Array.from(variations);
}

/**
 * Checks for exact or morphological taboo word violations
 */
export function checkTabooViolation(
  userTranscript: string,
  forbiddenWords: string[],
  additionalLemmas: string[] = []
): { violated: boolean; word?: string } {
  const lowerUser = userTranscript.toLowerCase();
  const allTabooRoots = Array.from(new Set([...forbiddenWords, ...additionalLemmas]));

  for (const root of allTabooRoots) {
    const variations = generateTabooVariations(root);
    for (const v of variations) {
      // Use regex word boundary to prevent false positives inside other unrelated words
      const regex = new RegExp(`\\b${v.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
      if (regex.test(lowerUser)) {
        return { violated: true, word: v };
      }
    }
  }

  return { violated: false };
}

/**
 * Detects whether the user framed their explanation with a valid Genus (Hypernym / Superordinate Category)
 */
export function analyzeGenus(
  userTranscript: string,
  task: CircumlocutionTask
): { detected: boolean; phrase?: string; score: number } {
  const lower = userTranscript.toLowerCase();

  // 1. Classical Aristotelian Framing Markers
  const framingPatterns = [
    /\b(it('s| is)|this is|that('s| is)) (a|an) (kind|type|sort|form|piece|variety) of\b/i,
    /\b(it('s| is)|this is) (a|an) (device|tool|machine|appliance|instrument|gadget|equipment|utensil|object|item|concept|person|place)\b/i,
    /\ba (kind|type|sort) of\b/i,
    /\bused as (a|an)\b/i,
  ];

  const hasFraming = framingPatterns.some((p) => p.test(lower));

  // 2. Category / Genus Keyword Match
  const genusTargets = [
    task.genus?.toLowerCase(),
    task.category?.toLowerCase(),
    task.hints.categoryHint?.toLowerCase(),
  ].filter(Boolean) as string[];

  // Extract key genus tokens (e.g. "appliance", "tool", "device", "clothing", "transportation")
  const genusKeywords = new Set<string>([
    "appliance", "tool", "machine", "device", "instrument", "utensil", "gadget",
    "item", "object", "clothing", "vehicle", "furniture", "document", "service",
    "place", "person", "concept", "feeling", "software", "food", "drink"
  ]);

  for (const target of genusTargets) {
    const words = target.split(/[^a-zA-Z]+/);
    for (const w of words) {
      if (w.length >= 4) genusKeywords.add(w.toLowerCase());
    }
  }

  let matchedKeyword = "";
  for (const kw of genusKeywords) {
    if (new RegExp(`\\b${kw}\\b`, "i").test(lower)) {
      matchedKeyword = kw;
      break;
    }
  }

  if (hasFraming && matchedKeyword) {
    return { detected: true, phrase: matchedKeyword, score: 95 };
  } else if (hasFraming) {
    return { detected: true, phrase: "genus framing marker", score: 80 };
  } else if (matchedKeyword) {
    return { detected: true, phrase: matchedKeyword, score: 70 };
  }

  return { detected: false, score: 25 };
}

/**
 * Detects whether the user provided the Differentia Specifica (distinguishing functions / features)
 */
export function analyzeDifferentia(
  userTranscript: string,
  task: CircumlocutionTask
): { detected: boolean; anchorsHit: string[]; anchorsMissed: string[]; score: number } {
  const lower = userTranscript.toLowerCase();

  // 1. Distinguishing functional connectors
  const functionalPatterns = [
    /\bused (to|for)\b/i,
    /\bthat (you|we|people|one) (use to|can|have to)\b/i,
    /\ballows (you|us|people) to\b/i,
    /\bdesigned (to|for)\b/i,
    /\bwhen (you|we) want to\b/i,
    /\byou (press|wear|hold|carry|drink|eat|cut|see|hear) it\b/i,
    /\bhelps (you|us) to\b/i,
  ];

  const hasFunctionalPattern = functionalPatterns.some((p) => p.test(lower));

  // 2. Semantic Anchors Match
  const candidateAnchors = (task.semanticKeyAnchors && task.semanticKeyAnchors.length > 0)
    ? task.semanticKeyAnchors
    : task.hints.starterHint?.split(/\s+/).filter((w) => w.length >= 4) || [];

  const anchorsHit: string[] = [];
  const anchorsMissed: string[] = [];

  for (const anchor of candidateAnchors) {
    const cleanAnchor = anchor.toLowerCase().trim();
    if (!cleanAnchor) continue;
    if (lower.includes(cleanAnchor)) {
      anchorsHit.push(cleanAnchor);
    } else {
      anchorsMissed.push(cleanAnchor);
    }
  }

  const anchorRatio = candidateAnchors.length > 0 ? anchorsHit.length / candidateAnchors.length : 0.5;
  const isDetected = hasFunctionalPattern || anchorsHit.length >= 1;

  let score = 30;
  if (hasFunctionalPattern && anchorsHit.length >= 2) {
    score = 95;
  } else if (hasFunctionalPattern || anchorsHit.length >= 1) {
    score = Math.round(60 + anchorRatio * 35);
  }

  return {
    detected: isDetected,
    anchorsHit,
    anchorsMissed,
    score: Math.min(100, Math.max(0, score)),
  };
}

/**
 * High-level Aristotelian Evaluation Engine
 */
export function analyzeAristotelianCircumlocution(
  task: CircumlocutionTask,
  userTranscript: string
): AristotelianAnalysis {
  const tabooCheck = checkTabooViolation(userTranscript, task.forbiddenWords, task.tabooLemmas);
  const genusResult = analyzeGenus(userTranscript, task);
  const diffResult = analyzeDifferentia(userTranscript, task);

  const tabooViolated = tabooCheck.violated;
  const violatedWord = tabooCheck.word;

  // Calculate composite semantic precision score
  let semanticPrecisionScore = Math.round(genusResult.score * 0.4 + diffResult.score * 0.6);
  if (tabooViolated) {
    semanticPrecisionScore = Math.min(30, semanticPrecisionScore);
  }

  // Simulate Listener Guessing
  let listenerGuess = "";
  let feedback = "";

  if (tabooViolated) {
    listenerGuess = `Lỡ miệng nói từ cấm ("${violatedWord}")`;
    feedback = `Bạn đã vô tình nói từ cấm "${violatedWord}". Trong giao tiếp khi quên từ, hãy kiên trì dùng công thức [Chủng loại + Công dụng] thay vì buột miệng nói từ đó.`;
  } else if (userTranscript.trim().split(/\s+/).length < 4) {
    listenerGuess = "Quá ngắn, người nghe chưa kịp hiểu";
    feedback = "Lời diễn giải của bạn quá ngắn. Hãy bắt đầu bằng 'It's a kind of...' và miêu tả ít nhất một công dụng cốt lõi.";
  } else if (genusResult.detected && diffResult.detected && semanticPrecisionScore >= 75) {
    listenerGuess = `${task.targetWord.toUpperCase()} (Đoán trúng 100%!)`;
    feedback = `Xuất sắc! Lời giải thích của bạn chuẩn phong cách người bản xứ: vừa nêu đúng chủng loại (${genusResult.phrase || task.category}) vừa nêu bật được công dụng độc nhất.`;
  } else if (genusResult.detected) {
    listenerGuess = `Một vật dụng thuộc nhóm "${task.category}"?`;
    feedback = `Bạn đã mở đầu rất tốt với chủng loại (${genusResult.phrase || task.category}), nhưng cần làm rõ thêm công dụng cốt lõi (Differentia) để người nghe đoán ra chính xác.`;
  } else if (diffResult.detected) {
    listenerGuess = `Một thứ gì đó để ${task.vietnameseMeaning}?`;
    feedback = `Bạn đã nêu được công dụng khá tốt, nhưng thiếu cụm từ phân loại (Genus, ví dụ: "It's a kind of appliance / tool / device") để giúp người nghe định hình nhanh hơn.`;
  } else {
    listenerGuess = "Khái niệm chưa rõ ràng";
    feedback = `Lời diễn giải chưa làm nổi bật được chủng loại hoặc công dụng của "${task.vietnameseMeaning}". Hãy thử dùng mẫu: "It's a kind of... that you use to...".`;
  }

  return {
    tabooViolated,
    violatedWord,
    genusDetected: genusResult.detected,
    genusMatchPhrase: genusResult.phrase,
    genusScore: genusResult.score,
    differentiaDetected: diffResult.detected,
    anchorsHit: diffResult.anchorsHit,
    anchorsMissed: diffResult.anchorsMissed,
    functionScore: diffResult.score,
    semanticPrecisionScore,
    listenerGuess,
    pedagogicalFeedbackVi: feedback,
  };
}
