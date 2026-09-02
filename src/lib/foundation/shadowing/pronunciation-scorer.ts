/**
 * Shadowing Pronunciation Scorer
 * Pure algorithmic scoring — No AI needed.
 * 
 * Computes 3-dimensional score from STT transcript vs reference sentence:
 *  - Accuracy: word-level Levenshtein match ratio
 *  - Fluency: estimated from recording duration vs expected duration
 *  - Prosody: estimated from content-word coverage (stressed words match)
 */

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return normalizeText(text).split(" ").filter(Boolean);
}

/**
 * Levenshtein distance between two token arrays.
 * Returns number of insertions/deletions/substitutions.
 */
function editDistance(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

// CEFR-based stop words to deprioritize in content-word matching
const STOP_WORDS = new Set([
  "the", "a", "an", "is", "was", "are", "were", "be", "been", "being",
  "i", "you", "he", "she", "it", "we", "they", "my", "your", "his",
  "her", "its", "our", "their", "this", "that", "to", "of", "in", "on",
  "at", "by", "for", "with", "and", "or", "but", "so", "if", "as",
  "do", "did", "does", "have", "has", "had", "not", "no", "very",
  "from", "can", "will", "would", "could", "should", "may", "might",
  "just", "only", "also", "about", "there", "here", "up", "out",
]);

function isContentWord(w: string): boolean {
  return !STOP_WORDS.has(w);
}

export interface ShadowingScoreResult {
  /** 0–100: word-level match ratio via Levenshtein */
  accuracy: number;
  /** 0–100: duration-based fluency estimation */
  fluency: number;
  /** 0–100: content-word / stressed-word coverage */
  prosody: number;
  /** weighted overall */
  overall: number;
  /** words in reference that were correctly matched */
  correctWords: string[];
  /** words in reference that were missed/wrong */
  missedWords: string[];
  /** brief coaching remark in Vietnamese */
  coachRemarkVi: string;
}

/**
 * Compute shadowing score without AI.
 *
 * @param referenceText  - Ground truth sentence from transcript
 * @param spokenText     - STT transcript from user's mic
 * @param recordingDurationMs - Actual recording duration in ms
 * @param expectedDurationMs  - Expected duration from segment timestamps (ms)
 * @param stressWords    - List of content words considered stressed (from AI analysis)
 */
export function computeShadowingScore(
  referenceText: string,
  spokenText: string,
  recordingDurationMs: number,
  expectedDurationMs: number,
  stressWords: string[] = []
): ShadowingScoreResult {
  if (!spokenText || spokenText.trim().length < 2) {
    return {
      accuracy: 0,
      fluency: 0,
      prosody: 0,
      overall: 0,
      correctWords: [],
      missedWords: tokenize(referenceText),
      coachRemarkVi: "Không ghi nhận được giọng nói. Hãy bật micro và nói rõ hơn.",
    };
  }

  const refTokens = tokenize(referenceText);
  const spkTokens = tokenize(spokenText);

  // ─── ACCURACY (45% weight) ───────────────────────────────────────────
  // Edit distance ratio: higher match = higher accuracy
  const maxLen = Math.max(refTokens.length, spkTokens.length, 1);
  const dist = editDistance(refTokens, spkTokens);
  const rawAccuracy = Math.max(0, (maxLen - dist) / maxLen);
  const accuracy = Math.round(rawAccuracy * 100);

  // Determine correct vs missed words
  const spkSet = new Set(spkTokens);
  const correctWords = refTokens.filter((w) => spkSet.has(w));
  const missedWords = refTokens.filter((w) => !spkSet.has(w));

  // ─── FLUENCY (30% weight) ─────────────────────────────────────────────
  // Ratio of actual duration vs expected. Ideal: 0.8x – 1.5x of expected.
  // Too fast (<0.5x) or too slow (>2.5x) penalized.
  let fluency = 85; // default for unknown duration
  if (recordingDurationMs > 0 && expectedDurationMs > 0) {
    const ratio = recordingDurationMs / expectedDurationMs;
    if (ratio >= 0.8 && ratio <= 1.5) {
      fluency = 95;
    } else if (ratio >= 0.6 && ratio < 0.8) {
      // Slightly fast
      fluency = 80;
    } else if (ratio > 1.5 && ratio <= 2.5) {
      // Slightly slow
      fluency = 75;
    } else if (ratio < 0.6) {
      // Too fast
      fluency = 55 + Math.round(ratio * 50);
    } else {
      // Too slow (>2.5x)
      fluency = Math.max(40, 100 - Math.round((ratio - 1.5) * 20));
    }
  }

  // ─── PROSODY (25% weight) ─────────────────────────────────────────────
  // Coverage of content/stressed words
  const contentWordsRef = refTokens.filter(isContentWord);
  const stressSet = new Set([...stressWords.map(normalizeText), ...contentWordsRef]);
  const stressArr = Array.from(stressSet);

  let prosody = 70;
  if (stressArr.length > 0) {
    const hitCount = stressArr.filter((w) => spkSet.has(w)).length;
    const ratio = hitCount / stressArr.length;
    prosody = Math.round(
      // Boost a bit if got all stressed words; penalize if missed many
      40 + ratio * 60
    );
  }

  // ─── OVERALL WEIGHTED ────────────────────────────────────────────────
  const overall = Math.round(accuracy * 0.45 + fluency * 0.30 + prosody * 0.25);

  // ─── COACH REMARK ─────────────────────────────────────────────────────
  const coachRemarkVi = buildCoachRemark(accuracy, fluency, prosody, missedWords);

  return { accuracy, fluency, prosody, overall, correctWords, missedWords, coachRemarkVi };
}

function buildCoachRemark(
  accuracy: number,
  fluency: number,
  prosody: number,
  missedWords: string[]
): string {
  const weakest = [
    { name: "accuracy", score: accuracy },
    { name: "fluency", score: fluency },
    { name: "prosody", score: prosody },
  ].sort((a, b) => a.score - b.score)[0];

  if (accuracy >= 88 && fluency >= 80 && prosody >= 75) {
    return "🎉 Xuất sắc! Bạn phát âm rất chuẩn và trôi chảy. Hãy thử câu tiếp theo.";
  }

  if (weakest.name === "accuracy" && accuracy < 70) {
    const examples = missedWords.slice(0, 2).join(", ");
    return `🎯 Tập trung phát âm rõ hơn, đặc biệt các từ: "${examples || "câu chưa rõ"}". Nghe lại gốc và nhại theo.`;
  }

  if (weakest.name === "fluency") {
    if (fluency < 65) {
      return "⚡ Tốc độ chưa khớp với người nói gốc — hãy thử nghe lại và đọc theo sát nhịp hơn.";
    }
    return "⏱️ Nhịp độ ổn nhưng chưa hoàn toàn khớp — luyện A-B loop câu này thêm vài lần.";
  }

  if (weakest.name === "prosody") {
    return "🎵 Chú ý nhấn vào từ quan trọng trong câu (content words). Đừng đọc đều tất cả các từ.";
  }

  return "✅ Tốt! Hãy luyện thêm để tăng độ trôi chảy.";
}
