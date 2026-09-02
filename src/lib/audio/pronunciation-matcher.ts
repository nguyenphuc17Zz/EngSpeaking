// Word-by-word pronunciation and alignment matching algorithm for Corodomo-style Shadowing

export interface MatchedWord {
  word: string;
  cleanWord: string;
  status: "correct" | "partial" | "missing";
  spokenWord?: string;
  score: number; // 0 to 1
  note?: string;
}

export interface PronunciationMatchResult {
  words: MatchedWord[];
  overallScore: number; // 0 to 100
  correctCount: number;
  partialCount: number;
  missingCount: number;
  accuracyBadge: "Xuất sắc 🎉" | "Khá tốt 👍" | "Cần cố gắng 💡";
  feedbackMessage: string;
}

function cleanString(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, "")
    .trim();
}

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

function calculateWordSimilarity(w1: string, w2: string): number {
  const c1 = cleanString(w1);
  const c2 = cleanString(w2);

  if (!c1 || !c2) return 0;
  if (c1 === c2) return 1.0;

  // Handle common contractions & informal reductions
  const reductions: Record<string, string[]> = {
    wanna: ["want", "to"],
    gonna: ["going", "to"],
    gotta: ["got", "to"],
    kinda: ["kind", "of"],
    sorta: ["sort", "of"],
    dya: ["do", "you"],
    whaddya: ["what", "do", "you"],
  };

  if (reductions[c2]?.includes(c1) || reductions[c1]?.includes(c2)) {
    return 0.95;
  }

  const maxLen = Math.max(c1.length, c2.length);
  const dist = levenshteinDistance(c1, c2);
  const similarity = 1 - dist / maxLen;

  return Math.max(0, similarity);
}

export function evaluateSpokenSentence(
  targetSentence: string,
  spokenSentence: string
): PronunciationMatchResult {
  const targetWords = targetSentence.split(/\s+/).filter(Boolean);
  const spokenWords = spokenSentence.split(/\s+/).filter(Boolean);

  if (targetWords.length === 0) {
    return {
      words: [],
      overallScore: 0,
      correctCount: 0,
      partialCount: 0,
      missingCount: 0,
      accuracyBadge: "Cần cố gắng 💡",
      feedbackMessage: "Chưa có dữ liệu câu mục tiêu.",
    };
  }

  if (spokenWords.length === 0) {
    return {
      words: targetWords.map((w) => ({
        word: w,
        cleanWord: cleanString(w),
        status: "missing",
        score: 0,
        note: "Chưa nghe thấy từ này",
      })),
      overallScore: 0,
      correctCount: 0,
      partialCount: 0,
      missingCount: targetWords.length,
      accuracyBadge: "Cần cố gắng 💡",
      feedbackMessage: "Chưa nhận diện được giọng nói. Hãy bấm mic và nói to, rõ ràng hơn nhé.",
    };
  }

  let spokenIndex = 0;
  const matchedWords: MatchedWord[] = [];
  let correctCount = 0;
  let partialCount = 0;
  let missingCount = 0;

  for (let i = 0; i < targetWords.length; i++) {
    const tWord = targetWords[i];
    const cleanT = cleanString(tWord);

    // Look ahead up to 3 spoken words to find best match
    let bestMatchScore = 0;
    let bestSpokenIdx = -1;

    for (let j = spokenIndex; j < Math.min(spokenIndex + 4, spokenWords.length); j++) {
      const sim = calculateWordSimilarity(cleanT, spokenWords[j]);
      if (sim > bestMatchScore) {
        bestMatchScore = sim;
        bestSpokenIdx = j;
      }
    }

    if (bestMatchScore >= 0.82) {
      // Correct (Green)
      matchedWords.push({
        word: tWord,
        cleanWord: cleanT,
        status: "correct",
        spokenWord: spokenWords[bestSpokenIdx],
        score: bestMatchScore,
      });
      correctCount++;
      spokenIndex = bestSpokenIdx + 1;
    } else if (bestMatchScore >= 0.5) {
      // Partial (Yellow)
      matchedWords.push({
        word: tWord,
        cleanWord: cleanT,
        status: "partial",
        spokenWord: spokenWords[bestSpokenIdx],
        score: bestMatchScore,
        note: "Phát âm gần đúng, chú ý âm đuôi và trọng âm",
      });
      partialCount++;
      spokenIndex = bestSpokenIdx + 1;
    } else {
      // Missing / Mispronounced (Red)
      matchedWords.push({
        word: tWord,
        cleanWord: cleanT,
        status: "missing",
        score: 0,
        note: "Thiếu hoặc phát âm sai từ này",
      });
      missingCount++;
    }
  }

  const totalScoreSum = matchedWords.reduce((acc, w) => acc + w.score, 0);
  const overallScore = Math.round((totalScoreSum / targetWords.length) * 100);

  let accuracyBadge: PronunciationMatchResult["accuracyBadge"] = "Cần cố gắng 💡";
  let feedbackMessage = "Bạn đã nhại lại được một phần, hãy nghe lại video và lặp lại lần nữa nhé!";

  if (overallScore >= 85) {
    accuracyBadge = "Xuất sắc 🎉";
    feedbackMessage = "Phát âm và nhịp điệu của bạn rất chuẩn xác so với người bản xứ!";
  } else if (overallScore >= 65) {
    accuracyBadge = "Khá tốt 👍";
    feedbackMessage = "Tốc độ và từ ngữ tương đối tốt, hãy chú ý các từ màu vàng và đỏ để hoàn thiện hơn.";
  }

  return {
    words: matchedWords,
    overallScore,
    correctCount,
    partialCount,
    missingCount,
    accuracyBadge,
    feedbackMessage,
  };
}
