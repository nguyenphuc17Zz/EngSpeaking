// Shared Text Normalization, String Similarity, and Speech Hesitation Utilities
// Used across Foundation Fast-Pass Evaluators (Sentence Builder, VN-to-EN, Latency, Survival, Retry Lab)

export const CONTRACTION_MAP: Record<string, string> = {
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
  hell: "i will",
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

// Fix "hell" mapping to "he will"
CONTRACTION_MAP.hell = "he will";

export const FILLER_WORDS: readonly string[] = [
  "uh",
  "um",
  "er",
  "ah",
  "like",
  "you know",
  "i mean",
  "actually",
] as const;

/**
 * Normalizes spoken English text:
 * - Lowercases and normalizes apostrophe variations
 * - Expands contractions to canonical forms
 * - Strips punctuation marks
 * - Collapses extra whitespace
 */
export function normalizeSpokenText(text: string): string {
  if (!text) return "";

  const cleaned = text
    .toLowerCase()
    .replace(/[’‘`\u2018\u2019]/g, "'")
    .replace(/[.,/#!$%^&*;:{}=\-_~()?"\\]/g, " ")
    .trim();

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const normalizedTokens = tokens.map((tok) => {
    const mapped = CONTRACTION_MAP[tok];
    if (mapped) return mapped;
    return tok.replace(/'/g, " ");
  });

  return normalizedTokens.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Standard Levenshtein Distance implementation
 */
export function calculateLevenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculates normalized Levenshtein similarity ratio between 0.0 and 1.0
 */
export function computeLevenshteinSimilarity(a: string, b: string): number {
  const normA = normalizeSpokenText(a);
  const normB = normalizeSpokenText(b);

  if (!normA && !normB) return 1.0;
  if (!normA || !normB) return 0.0;
  if (normA === normB) return 1.0;

  const maxLen = Math.max(normA.length, normB.length);
  const dist = calculateLevenshteinDistance(normA, normB);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Computes Token Overlap Jaccard Similarity between two strings
 */
export function computeTokenOverlap(a: string, b: string): number {
  const tokensA = new Set(normalizeSpokenText(a).split(/\s+/).filter(Boolean));
  const tokensB = new Set(normalizeSpokenText(b).split(/\s+/).filter(Boolean));

  if (tokensA.size === 0 && tokensB.size === 0) return 1.0;
  if (tokensA.size === 0 || tokensB.size === 0) return 0.0;

  let intersection = 0;
  tokensA.forEach((t) => {
    if (tokensB.has(t)) intersection++;
  });

  const union = new Set([...tokensA, ...tokensB]).size;
  return intersection / union;
}

export interface SharedHesitationMetrics {
  wpm: number;
  durationMs: number;
  hesitationLevel: "smooth" | "moderate" | "hesitant";
  pauseEstimatedSec: number;
}

/**
 * Calculates acoustic & speech rate hesitation metrics
 */
export function calculateHesitationMetrics(params: {
  userTranscript: string;
  speechDurationMs: number;
  latencyMs?: number;
}): SharedHesitationMetrics {
  const norm = normalizeSpokenText(params.userTranscript);
  const words = norm.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const durationSec = Math.max(0.6, params.speechDurationMs / 1000);
  const wpm = Math.round((wordCount / durationSec) * 60);

  // Normal conversational speech is 110-150 WPM.
  // Slow/hesitant speech is < 85 WPM with notable pauses.
  const idealDurationSec = wordCount / 2.2; // ~130 WPM
  const pauseEstimatedSec = Math.max(0, Math.round((durationSec - idealDurationSec) * 10) / 10);

  let hesitationLevel: SharedHesitationMetrics["hesitationLevel"] = "smooth";
  if (wpm < 75 || pauseEstimatedSec > 2.0) {
    hesitationLevel = "hesitant";
  } else if (wpm < 105 || pauseEstimatedSec > 1.0) {
    hesitationLevel = "moderate";
  }

  return {
    wpm,
    durationMs: params.speechDurationMs,
    hesitationLevel,
    pauseEstimatedSec,
  };
}
