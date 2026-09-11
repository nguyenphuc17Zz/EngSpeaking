// Needleman-Wunsch & LCS Token Alignment for Spoken Repair Lab (Function 4)
// Accurately tracks word-level repairs, persisted errors, unchanged anchors, and insertions

import type { RepairDiffToken } from "@/types/retry-loop";

function cleanWord(w: string): string {
  return w.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, "").trim();
}

/**
 * Computes a fine-grained word-by-word diff alignment between the erroneous sentence
 * and the user's repaired spoken sentence.
 */
export function computeTokenAlignment(params: {
  originalSentence: string;
  repairedSentence: string;
  erroneousWord: string;
  minimalCorrection: string;
}): RepairDiffToken[] {
  const { originalSentence, repairedSentence, erroneousWord, minimalCorrection } = params;

  const origTokens = originalSentence.trim().split(/\s+/).filter(Boolean);
  const repTokens = repairedSentence.trim().split(/\s+/).filter(Boolean);

  if (repTokens.length === 0) {
    return [];
  }

  const cleanTargetWords = minimalCorrection.trim().split(/\s+/).map(cleanWord).filter(Boolean);
  const cleanErrWords = erroneousWord.trim().split(/\s+/).map(cleanWord).filter(Boolean);

  // 1. Compute Longest Common Subsequence (LCS) matrix
  const m = origTokens.length;
  const n = repTokens.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (cleanWord(origTokens[i]) === cleanWord(repTokens[j])) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // 2. Backtrack to find LCS matching indices in repTokens
  const matchedInRep = new Set<number>();
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (cleanWord(origTokens[i - 1]) === cleanWord(repTokens[j - 1])) {
      matchedInRep.add(j - 1);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  // 3. Build RepairDiffToken list for the repaired sentence
  const result: RepairDiffToken[] = [];

  for (let k = 0; k < repTokens.length; k++) {
    const word = repTokens[k];
    const cw = cleanWord(word);

    const isTarget = cleanTargetWords.includes(cw);
    const isError = cleanErrWords.includes(cw);

    if (isTarget) {
      result.push({
        text: word,
        status: "repaired",
        isTargetFix: true,
      });
    } else if (isError) {
      result.push({
        text: word,
        status: "error_persisted",
        isTargetFix: false,
      });
    } else if (matchedInRep.has(k)) {
      result.push({
        text: word,
        status: "unchanged",
      });
    } else {
      result.push({
        text: word,
        status: "inserted",
      });
    }
  }

  return result;
}
