// Fast-Pass Instant Latency Evaluation & Buffer Chunk Matching Engine
// Sub-30ms client-side evaluation with automatic 4-quadrant classification & Buffer Priming detection

import type {
  LatencyTask,
  LatencyEvaluation,
  LatencyQuadrant,
  LatencyStatus,
  LatencyLikelyCause,
  BufferChunkCandidate,
  HesitationProfile,
} from "@/types/latency-training";

const CONTRACTION_MAP: Record<string, string> = {
  "i'm": "i am",
  im: "i am",
  "you're": "you are",
  youre: "you are",
  "he's": "he is",
  hes: "he is",
  "she's": "she is",
  shes: "she is",
  "it's": "it is",
  its: "it is",
  "we're": "we are",
  were: "we are",
  "they're": "they are",
  theyre: "they are",
  "don't": "do not",
  dont: "do not",
  "doesn't": "does not",
  doesnt: "does not",
  "didn't": "did not",
  didnt: "did not",
  "won't": "will not",
  wont: "will not",
  "can't": "cannot",
  cant: "cannot",
  "couldn't": "could not",
  couldnt: "could not",
  "shouldn't": "should not",
  shouldnt: "should not",
  "wouldn't": "would not",
  wouldnt: "would not",
  "isn't": "is not",
  isnt: "is not",
  "aren't": "are not",
  arent: "are not",
  "wasn't": "was not",
  wasnt: "was not",
  "weren't": "were not",
  werent: "were not",
  "haven't": "have not",
  havent: "have not",
  "hasn't": "has not",
  hasnt: "has not",
  "hadn't": "had not",
  hadnt: "had not",
  "i've": "i have",
  ive: "i have",
  "you've": "you have",
  youve: "you have",
  "we've": "we have",
  weve: "we have",
  "they've": "they have",
  theyve: "they have",
  "i'll": "i will",
  ill: "i will",
  "you'll": "you will",
  youll: "you will",
  "he'll": "he will",
  hell: "he will",
  "she'll": "she will",
  shell: "she will",
  "we'll": "we will",
  well: "we will",
  "they'll": "they will",
  theyll: "they will",
  "let's": "let us",
  lets: "let us",
  gonna: "going to",
  wanna: "want to",
  gotta: "got to",
};

export const COMMON_BUFFER_CHUNKS: BufferChunkCandidate[] = [
  { phrase: "Well, to be honest...", meaningVi: "Thành thật mà nói...", category: "buying_time" },
  { phrase: "Let me see...", meaningVi: "Để tôi xem nào...", category: "buying_time" },
  { phrase: "To tell you the truth...", meaningVi: "Nói thật với bạn...", category: "buying_time" },
  { phrase: "From my perspective...", meaningVi: "Theo góc nhìn của tôi...", category: "framing_opinion" },
  { phrase: "In my opinion...", meaningVi: "Theo ý kiến của tôi...", category: "framing_opinion" },
  { phrase: "Personally speaking...", meaningVi: "Cá nhân tôi thấy...", category: "framing_opinion" },
  { phrase: "As far as I know...", meaningVi: "Theo như tôi biết...", category: "framing_opinion" },
  { phrase: "Off the top of my head...", meaningVi: "Nghĩ ngay lúc này thì...", category: "immediate_reaction" },
  { phrase: "Honestly speaking...", meaningVi: "Thật lòng mà nói...", category: "immediate_reaction" },
  { phrase: "Actually...", meaningVi: "Thực ra là...", category: "immediate_reaction" },
];

export function normalizeText(text: string): string {
  if (!text) return "";
  const cleaned = text
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[.,/#!$%^&*;:{}=\-_~()?"\\]/g, " ")
    .trim();

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const normalizedTokens = tokens.map((tok) => CONTRACTION_MAP[tok] || tok);
  return normalizedTokens.join(" ").replace(/\s+/g, " ").trim();
}

export function calculateLevenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Detects if the user transcript begins with or includes an conversational buffer chunk.
 */
export function detectBufferChunk(
  userTranscript: string,
  taskBufferChunks?: BufferChunkCandidate[]
): { bufferUsed?: string; bufferCategory?: BufferChunkCandidate["category"] } {
  const norm = normalizeText(userTranscript);
  if (!norm) return {};

  const allChunks = [...(taskBufferChunks || []), ...COMMON_BUFFER_CHUNKS];

  for (const chunk of allChunks) {
    const chunkNorm = normalizeText(chunk.phrase);
    if (!chunkNorm) continue;

    // Check if transcript starts with or contains the buffer chunk
    if (norm.startsWith(chunkNorm) || norm.includes(chunkNorm)) {
      return { bufferUsed: chunk.phrase.replace(/\.{2,}$/, ""), bufferCategory: chunk.category };
    }

    // Fuzzy check for first 3-4 words if phrase length is similar
    const chunkWords = chunkNorm.split(" ");
    const userWords = norm.split(" ").slice(0, chunkWords.length);
    if (userWords.length >= 2 && userWords.length === chunkWords.length) {
      const userPrefix = userWords.join(" ");
      const dist = calculateLevenshteinDistance(userPrefix, chunkNorm);
      if (dist <= 2) {
        return { bufferUsed: chunk.phrase.replace(/\.{2,}$/, ""), bufferCategory: chunk.category };
      }
    }
  }

  return {};
}

/**
 * Evaluates keywords and semantic match against sample responses.
 */
export function evaluateAccuracy(
  userTranscript: string,
  task: LatencyTask
): { accuracyScore: number; matchedKeywords: string[]; bestSampleSimilarity: number } {
  const normUser = normalizeText(userTranscript);
  if (!normUser) {
    return { accuracyScore: 0, matchedKeywords: [], bestSampleSimilarity: 0 };
  }

  const userTokens = normUser.split(/\s+/).filter(Boolean);
  const userSet = new Set(userTokens);

  // 1. Keyword overlap
  const expected = task.expectedKeywords || [];
  const matchedKeywords: string[] = [];

  for (const kw of expected) {
    const kwNorm = normalizeText(kw);
    const kwTokens = kwNorm.split(/\s+/).filter(Boolean);
    if (kwTokens.length === 1) {
      if (
        userSet.has(kwNorm) ||
        userTokens.some((t) => Math.abs(t.length - kwNorm.length) <= 1 && calculateLevenshteinDistance(t, kwNorm) <= 1)
      ) {
        matchedKeywords.push(kw);
      }
    } else if (kwTokens.length > 1) {
      if (normUser.includes(kwNorm)) {
        matchedKeywords.push(kw);
      }
    }
  }

  const keywordRatio = expected.length > 0 ? matchedKeywords.length / expected.length : 1.0;

  // 2. Similarity against sample responses
  const samples = task.sampleResponses || [];
  let bestSim = 0;

  for (const sample of samples) {
    const normSample = normalizeText(sample);
    const sampleTokens = normSample.split(/\s+/).filter(Boolean);
    if (sampleTokens.length === 0) continue;

    const sampleSet = new Set(sampleTokens);
    let intersection = 0;
    for (const st of sampleSet) {
      if (userSet.has(st) || userTokens.some((ut) => Math.abs(ut.length - st.length) <= 1 && calculateLevenshteinDistance(ut, st) <= 1)) {
        intersection++;
      }
    }
    const tokenSim = intersection / Math.max(sampleSet.size, 1);

    const maxLen = Math.max(normUser.length, normSample.length);
    const levDist = calculateLevenshteinDistance(normUser, normSample);
    const charSim = maxLen > 0 ? 1 - levDist / maxLen : 0;

    const combinedSim = tokenSim * 0.7 + Math.max(0, charSim) * 0.3;
    if (combinedSim > bestSim) bestSim = combinedSim;
  }

  // Weight combination
  let rawScore = 0;
  if (expected.length > 0 && samples.length > 0) {
    rawScore = keywordRatio * 50 + bestSim * 50;
  } else if (expected.length > 0) {
    rawScore = keywordRatio * 100;
  } else if (samples.length > 0) {
    rawScore = bestSim * 100;
  } else {
    rawScore = Math.min(100, userTokens.length * 15);
  }

  // Bonus for detailed answers
  if (userTokens.length >= 4 && rawScore > 40) {
    rawScore = Math.min(100, rawScore + 5);
  }

  const accuracyScore = Math.round(Math.min(100, Math.max(0, rawScore)));
  return { accuracyScore, matchedKeywords, bestSampleSimilarity: bestSim };
}

export interface FastPassLatencyOptions {
  responseLatencyMs: number;
  speechDurationMs: number;
  speechOnsetMs?: number;
  targetLatencyMs?: number;
}

export interface FastPassLatencyResult {
  canFastPass: boolean;
  evaluation: LatencyEvaluation;
}

/**
 * Computes Fast-Pass Latency evaluation in <30ms on the client.
 */
export function computeFastPassLatencyMatch(
  task: LatencyTask,
  userTranscript: string,
  opts: FastPassLatencyOptions
): FastPassLatencyResult {
  const normUser = normalizeText(userTranscript);
  const targetLatency = opts.targetLatencyMs ?? task.staircaseTargetMs ?? task.targetLatencyMs ?? 3000;
  const effectiveLatency = Math.max(200, opts.speechOnsetMs ?? opts.responseLatencyMs);

  // 1. Buffer Chunk Detection
  const { bufferUsed } = detectBufferChunk(userTranscript, task.bufferChunks);

  // 2. Accuracy Calculation
  const { accuracyScore, matchedKeywords, bestSampleSimilarity } = evaluateAccuracy(userTranscript, task);

  // 3. Timing & Quadrant Calculation
  const latencyRatio = Math.round((effectiveLatency / targetLatency) * 100) / 100;
  const isFast = effectiveLatency <= targetLatency * 1.15;
  const isCorrect = accuracyScore >= 68;

  let quadrant: LatencyQuadrant;
  if (isFast && isCorrect) quadrant = "fast_correct";
  else if (!isFast && isCorrect) quadrant = "slow_correct";
  else if (isFast && !isCorrect) quadrant = "fast_incorrect";
  else quadrant = "slow_incorrect";

  // Latency Status
  let latencyStatus: LatencyStatus;
  if (latencyRatio <= 0.65) latencyStatus = "excellent";
  else if (latencyRatio <= 1.0) latencyStatus = "strong";
  else if (latencyRatio <= 1.35) latencyStatus = "moderate";
  else if (latencyRatio <= 1.8) latencyStatus = "slow";
  else latencyStatus = "very_slow";

  // Likely Cause
  let likelyCause: LatencyLikelyCause;
  if (quadrant === "fast_correct") {
    likelyCause = "automatic";
  } else if (quadrant === "slow_correct") {
    likelyCause = bufferUsed ? "spoken_retrieval" : "grammar_calculation";
  } else if (quadrant === "fast_incorrect") {
    likelyCause = "vocabulary_search";
  } else {
    likelyCause = "hesitation";
  }

  // Hesitation Profile
  const fillerRegex = /\b(uh|um|er|ah|like|you know)\b/gi;
  const fillers = (userTranscript.match(fillerRegex) || []).map((f) => f.toLowerCase());
  const wordsPerMinute = opts.speechDurationMs > 0 ? (normUser.split(" ").length / (opts.speechDurationMs / 60000)) : 100;
  const hesitation: HesitationProfile = {
    fillerCount: fillers.length,
    fillersDetected: Array.from(new Set(fillers)),
    fillersPerMinute: Math.round((fillers.length / Math.max(1, opts.speechDurationMs / 60000)) * 10) / 10,
    pauseCount: fillers.length > 2 ? 2 : fillers.length > 0 ? 1 : 0,
    selfCorrectionDetected: /\b(i mean|or rather|sorry)\b/i.test(userTranscript),
  };

  // Scores
  const naturalnessScore = Math.min(
    100,
    Math.max(40, Math.round(accuracyScore * 0.7 + (bufferUsed ? 20 : 10) - fillers.length * 5))
  );
  const fluencyScore = Math.min(
    100,
    Math.max(30, Math.round((1 / Math.max(0.5, latencyRatio)) * 60 + (isFast ? 30 : 10)))
  );
  const overallScore = Math.round(accuracyScore * 0.45 + fluencyScore * 0.35 + naturalnessScore * 0.2);

  // Vietnamese Coaching Feedback
  const latencySec = (effectiveLatency / 1000).toFixed(2);
  let coachFeedbackVi = "";
  const praisePoints: string[] = [];

  if (quadrant === "fast_correct") {
    coachFeedbackVi = `Phản xạ xuất sắc! Bạn bật âm chỉ trong ${latencySec}s với độ chính xác đạt ${accuracyScore}%. Cơ chế Automaticity đang vận hành cực kỳ trơn tru.`;
    praisePoints.push(`Tốc độ phản xạ vượt mục tiêu (${latencySec}s <= ${(targetLatency / 1000).toFixed(1)}s)`);
    praisePoints.push("Đáp ứng trọn vẹn ý nghĩa câu hỏi");
    if (bufferUsed) {
      coachFeedbackVi += ` Rất tuyệt khi bạn ứng dụng ngay cụm đệm mở đầu "${bufferUsed}"!`;
      praisePoints.push(`Sử dụng buffer chunk thành thạo: "${bufferUsed}"`);
    }
  } else if (quadrant === "slow_correct") {
    coachFeedbackVi = `Nội dung diễn đạt rất chuẩn xác (${accuracyScore}%), tuy nhiên độ trễ còn cao (${latencySec}s so với mục tiêu ${(targetLatency / 1000).toFixed(1)}s). Bạn còn có xu hướng dịch nhẩm ngữ pháp trong đầu trước khi mở lời.`;
    praisePoints.push("Nắm vững cấu trúc và từ khóa mục tiêu");
    if (bufferUsed) {
      coachFeedbackVi += ` Điểm cộng là bạn đã chủ động đệm "${bufferUsed}" để tạo đà suy nghĩ.`;
      praisePoints.push(`Đã có phản xạ dùng buffer: "${bufferUsed}"`);
    } else {
      coachFeedbackVi += ` Mẹo phản xạ: Hãy bật ngay một cụm đệm (Buffer Chunk) như "${task.bufferChunks?.[0]?.phrase || "Well, to be honest..."}" ngay ở giây đầu tiên!`;
    }
  } else if (quadrant === "fast_incorrect") {
    coachFeedbackVi = `Tốc độ phản xạ rất tự tin (${latencySec}s), nhưng nội dung trả lời chưa bao hàm đúng các từ khóa mong đợi (${accuracyScore}%).`;
    praisePoints.push(`Tốc độ kích hoạt ngôn ngữ nhanh (${latencySec}s)`);
    coachFeedbackVi += ` Hãy duy trì phản xạ nhanh này, đồng thời kết nối thêm từ khóa then chốt: ${task.expectedKeywords.slice(0, 3).join(", ")}.`;
  } else {
    coachFeedbackVi = `Bạn bị ngập ngừng khá lâu (${latencySec}s) và câu trả lời chưa trọn vẹn (${accuracyScore}%). Điều này hoàn toàn bình thường khi não bộ vừa phải tìm từ vừa tính toán ngữ pháp.`;
    coachFeedbackVi += ` Chiến thuật khắc phục: Đừng im lặng! Hãy lập tức bật cụm đệm: "${task.bufferChunks?.[0]?.phrase || "Well, let me see..."}" để mua 1-2 giây quý giá.`;
  }

  const betterResponse = task.sampleResponses && task.sampleResponses.length > 0
    ? task.sampleResponses[0]
    : task.promptText;

  // Decide if confidence is high enough for Instant Fast-Pass without LLM wait:
  // - High accuracy match (>= 72%) OR
  // - Good keyword coverage (>= 75%) OR
  // - Close match with sample responses (>= 0.65) OR
  // - Fast & confident response with non-empty text
  const canFastPass =
    (accuracyScore >= 72) ||
    (task.expectedKeywords.length > 0 && matchedKeywords.length >= Math.ceil(task.expectedKeywords.length * 0.75)) ||
    (bestSampleSimilarity >= 0.65) ||
    (normUser.length === 0) || // Empty response is instant fail
    (isFast && accuracyScore >= 65);

  const evaluation: LatencyEvaluation = {
    overallScore,
    accuracyScore,
    naturalnessScore,
    fluencyScore,
    responseLatencyMs: effectiveLatency,
    speechDurationMs: opts.speechDurationMs,
    targetLatencyMs: targetLatency,
    latencyRatio,
    quadrant,
    latencyStatus,
    likelyCause,
    hesitation,
    userTranscript,
    cleanTranscript: normUser,
    isSuccessful: isCorrect,
    coachFeedbackVi,
    betterResponse,
    praisePoints,
    isFastPass: true,
    bufferUsed,
    speechOnsetMs: opts.speechOnsetMs ?? effectiveLatency,
  };

  return {
    canFastPass,
    evaluation,
  };
}
