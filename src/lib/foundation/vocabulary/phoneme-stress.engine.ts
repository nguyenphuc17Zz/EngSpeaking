// Phoneme & Stress Diagnostic Engine — Function 8 (Spoken Vocabulary Studio)
// Implements IPA decomposition, Vietnamese L1 phonological bias detection,
// weighted phoneme Levenshtein distance, minimal pair contrasting, and PVI rhythm metric.

export interface PhonemeToken {
  phoneme: string;
  type: "onset" | "nucleus" | "coda" | "stress";
  isStressed: boolean;
  status?: "correct" | "missing" | "distorted" | "neutral";
}

export interface SyllableBreakdown {
  raw: string;
  isPrimaryStressed: boolean;
  isSecondaryStressed: boolean;
  onset: string;
  nucleus: string;
  coda: string;
}

export interface VietnameseL1Pitfall {
  category: "final_consonant" | "stress_shift" | "vowel_flattening" | "fricative_substitution";
  titleVi: string;
  descriptionVi: string;
  targetPhoneme: string;
  detectedOrCommonError: string;
  severity: "high" | "medium" | "low";
}

export interface MinimalPairContrast {
  targetWord: string;
  confusedWord: string;
  distinctionKey: string;
  targetIpa: string;
  confusedIpa: string;
  explanationVi: string;
}

export interface PhonemeAnalysisResult {
  syllables: SyllableBreakdown[];
  primaryStressIndex: number;
  totalSyllables: number;
  criticalEndingConsonants: string[];
  vietnameseL1Pitfalls: VietnameseL1Pitfall[];
  suggestedMinimalPair?: MinimalPairContrast;
}

// Common L1 Vietnamese transfer biases for English codas & phonemes
const CRITICAL_CODAS = ["t", "d", "s", "z", "θ", "ð", "ʃ", "ʒ", "tʃ", "dʒ", "v", "l", "k", "p", "m", "n", "ŋ"];
const VOWELS_IPA = [
  "iː", "ɪ", "e", "æ", "ɑː", "ɒ", "ɔː", "ʊ", "uː", "ʌ", "ɜː", "ə",
  "eɪ", "aɪ", "ɔɪ", "aʊ", "əʊ", "oʊ", "ɪə", "eə", "ʊə"
];

// Minimal pairs knowledge base for high-frequency spoken English confusions
const MINIMAL_PAIRS_MAP: Record<string, { confused: string; targetIpa: string; confusedIpa: string; key: string; explanation: string }> = {
  decision: {
    confused: "decisive",
    targetIpa: "/dɪˈsɪʒ.ən/",
    confusedIpa: "/dɪˈsaɪ.sɪv/",
    key: "Trọng âm và nguyên âm /ɪ/ vs /aɪ/",
    explanation: "Đừng nhầm đuôi danh từ /ʒ.ən/ với tính từ /sɪv/.",
  },
  leave: {
    confused: "live",
    targetIpa: "/liːv/",
    confusedIpa: "/lɪv/",
    key: "Nguyên âm dài /iː/ vs nguyên âm ngắn /ɪ/",
    explanation: "Leave kéo dài môi cười /iːv/, còn live phát âm ngắn thả lỏng /lɪv/.",
  },
  ship: {
    confused: "sheep",
    targetIpa: "/ʃɪp/",
    confusedIpa: "/ʃiːp/",
    key: "Nguyên âm ngắn /ɪ/ vs nguyên âm dài /iː/",
    explanation: "Ship có nguyên âm /ɪ/ dứt khoát; sheep kéo dài căng mép môi.",
  },
  think: {
    confused: "sink",
    targetIpa: "/θɪŋk/",
    confusedIpa: "/sɪŋk/",
    key: "Âm thè lưỡi /θ/ vs âm răng /s/",
    explanation: "Đặt đầu lưỡi giữa hai hàm răng thổi nhẹ để tạo âm /θ/, không kẹp răng phát ra /s/.",
  },
  price: {
    confused: "prize",
    targetIpa: "/praɪs/",
    confusedIpa: "/praɪz/",
    key: "Âm đuôi vô thanh /s/ vs hữu thanh /z/",
    explanation: "Price kết thúc bằng /s/ chỉ có tiếng gió, prize rung dây thanh quản /z/.",
  },
  thought: {
    confused: "taught",
    targetIpa: "/θɔːt/",
    confusedIpa: "/tɔːt/",
    key: "Âm thè lưỡi /θ/ vs âm bật /t/",
    explanation: "Thought phải đưa đầu lưỡi ra giữa 2 răng, không được phát âm thành /t/ như tiếng Việt.",
  },
  heart: {
    confused: "hurt",
    targetIpa: "/hɑːrt/",
    confusedIpa: "/hɜːrt/",
    key: "Nguyên âm mở sâu /ɑː/ vs nguyên âm giữa /ɜː/",
    explanation: "Heart mở rộng khẩu hình vòm họng /ɑː/, hurt khép hờ môi đọc /ɜː/.",
  },
  world: {
    confused: "word",
    targetIpa: "/wɜːrld/",
    confusedIpa: "/wɜːrd/",
    key: "Âm l uốn lưỡi trước âm d (/rld/)",
    explanation: "World có âm /l/ uốn nhẹ đầu lưỡi chạm vòm họng trước khi bật âm /d/.",
  },
  collaborate: {
    confused: "corroborate",
    targetIpa: "/kəˈlæb.ə.reɪt/",
    confusedIpa: "/kəˈrɒb.ə.reɪt/",
    key: "Âm /l/ vs âm /r/ và trọng âm",
    explanation: "Chú ý đặt lưỡi âm /l/ ở âm tiết thứ hai kə-LÆB.",
  },
};

/**
 * Parses raw IPA string (e.g. "/dɪˈsɪʒ.ən/" or "dɪˈsɪʒən") into syllables and phonetic components
 */
export function decomposeIpa(ipa: string): PhonemeAnalysisResult {
  const clean = ipa.replace(/[\/\[\]]/g, "").trim();
  
  // Split syllables by '.' or stress marks
  // Normalize: prepend '.' before stress marks if not already separated
  const normalized = clean
    .replace(/ˈ/g, ".ˈ")
    .replace(/ˌ/g, ".ˌ")
    .replace(/\.+/g, ".");

  const rawSyllables = normalized.split(".").filter(Boolean);
  const syllables: SyllableBreakdown[] = [];
  let primaryStressIndex = 0;

  rawSyllables.forEach((sylText, idx) => {
    const isPrimary = sylText.includes("ˈ");
    const isSecondary = sylText.includes("ˌ");
    if (isPrimary) primaryStressIndex = idx;

    const pure = sylText.replace(/[ˈˌ]/g, "");

    // Find nucleus (longest matching vowel from VOWELS_IPA)
    let bestVowel = "";
    let vowelStart = -1;
    let vowelLen = 0;

    for (const v of VOWELS_IPA) {
      const pos = pure.indexOf(v);
      if (pos !== -1 && v.length > vowelLen) {
        bestVowel = v;
        vowelStart = pos;
        vowelLen = v.length;
      }
    }

    let onset = "";
    let nucleus = bestVowel;
    let coda = "";

    if (vowelStart !== -1) {
      onset = pure.slice(0, vowelStart);
      coda = pure.slice(vowelStart + vowelLen);
    } else {
      // Fallback if no exact match found: center character is nucleus
      const mid = Math.floor(pure.length / 2);
      onset = pure.slice(0, mid);
      nucleus = pure.slice(mid, mid + 1);
      coda = pure.slice(mid + 1);
    }

    syllables.push({
      raw: pure,
      isPrimaryStressed: isPrimary,
      isSecondaryStressed: isSecondary,
      onset,
      nucleus,
      coda,
    });
  });

  // Extract critical ending consonants (especially from the last syllable's coda)
  const lastSyl = syllables[syllables.length - 1];
  const criticalEndingConsonants: string[] = [];
  if (lastSyl && lastSyl.coda) {
    for (const c of CRITICAL_CODAS) {
      if (lastSyl.coda.includes(c)) {
        criticalEndingConsonants.push(c);
      }
    }
  }

  // Detect Vietnamese L1 Pitfalls
  const vietnameseL1Pitfalls: VietnameseL1Pitfall[] = [];

  // Pitfall 1: Final consonant omission
  if (criticalEndingConsonants.length > 0) {
    const endingStr = criticalEndingConsonants.map((c) => `/${c}/`).join(", ");
    vietnameseL1Pitfalls.push({
      category: "final_consonant",
      titleVi: "Bẫy nuốt âm đuôi (Final Consonant Deletion)",
      descriptionVi: `Tiếng Việt không có âm đuôi bật gió/xát. Người học thường bỏ quên âm đuôi ${endingStr} ở cuối từ này.`,
      targetPhoneme: endingStr,
      detectedOrCommonError: "Rơi âm cuối hoặc nuốt âm",
      severity: "high",
    });
  }

  // Pitfall 2: Stress shift (if multisyllabic)
  if (syllables.length > 1) {
    const stressedSyl = syllables[primaryStressIndex];
    vietnameseL1Pitfalls.push({
      category: "stress_shift",
      titleVi: `Trọng âm âm tiết thứ ${primaryStressIndex + 1} (Lexical Stress)`,
      descriptionVi: `Nhấn mạnh rõ vào âm tiết "${stressedSyl?.raw || ""}" (cao hơn, dài hơn, to hơn). Tránh phát âm đều đều kiểu thanh điệu tiếng Việt.`,
      targetPhoneme: stressedSyl?.raw || "",
      detectedOrCommonError: "Đọc đều âm tiết (Syllable-timed flat pitch)",
      severity: "high",
    });
  }

  // Pitfall 3: Fricatives (/θ/, /ð/, /ʒ/, /ʃ/)
  const hasDental = clean.includes("θ") || clean.includes("ð");
  if (hasDental) {
    vietnameseL1Pitfalls.push({
      category: "fricative_substitution",
      titleVi: "Bẫy thay thế âm thè lưỡi /θ/ hoặc /ð/",
      descriptionVi: "Người Việt có xu hướng đổi /θ/ thành /t/ hoặc /s/, và đổi /ð/ thành /d/ hoặc /z/. Đặt đầu lưỡi giữa 2 hàm răng và thổi hơi.",
      targetPhoneme: clean.includes("θ") ? "/θ/" : "/ð/",
      detectedOrCommonError: clean.includes("θ") ? "/t/ hoặc /s/" : "/d/ hoặc /z/",
      severity: "medium",
    });
  }

  return {
    syllables,
    primaryStressIndex,
    totalSyllables: syllables.length,
    criticalEndingConsonants,
    vietnameseL1Pitfalls,
  };
}

/**
 * Finds matching Minimal Pair Contrast for this word if exists
 */
export function getMinimalPairContrast(word: string): MinimalPairContrast | undefined {
  const lower = word.trim().toLowerCase();
  const hit = MINIMAL_PAIRS_MAP[lower];
  if (!hit) return undefined;

  return {
    targetWord: lower,
    confusedWord: hit.confused,
    distinctionKey: hit.key,
    targetIpa: hit.targetIpa,
    confusedIpa: hit.confusedIpa,
    explanationVi: hit.explanation,
  };
}

/**
 * Normalizes IPA symbols and English orthography into a unified rough phonetic sequence
 */
export function phoneticNormalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\/\[\]ˈˌ.]/g, "")
    .replace(/tʃ/g, "ch")
    .replace(/dʒ/g, "j")
    .replace(/θ|ð/g, "th")
    .replace(/ʃ/g, "sh")
    .replace(/ʒ/g, "s")
    .replace(/[iɪiː]/g, "i")
    .replace(/[uʊuː]/g, "u")
    .replace(/[ɔɒɔːɑː]/g, "o")
    .replace(/[eæ]/g, "e")
    .replace(/[əʌɜː]/g, "e")
    .replace(/tion|sion/g, "sen")
    .replace(/ck/g, "k")
    .replace(/ph/g, "f")
    .replace(/c(?=[eiy])/g, "s")
    .replace(/c/g, "k");
}

/**
 * Calculates Phoneme Levenshtein Distance with Vietnamese L1 weighted penalty
 */
export function calculateWeightedPhonemeScore(
  targetIpa: string,
  userSpokenWord: string,
  options: { targetWord?: string; penaltyMissingCoda?: boolean } = {}
): {
  similarityScore: number;
  codaScore: number;
  stressScore: number;
  isCloseMatch: boolean;
} {
  const normTarget = phoneticNormalize(targetIpa);
  const normUser = phoneticNormalize(userSpokenWord);

  if (normUser === "" || normTarget === "") {
    return { similarityScore: 0, codaScore: 0, stressScore: 0, isCloseMatch: false };
  }

  // If exact orthographic match with targetWord
  if (options.targetWord && userSpokenWord.trim().toLowerCase() === options.targetWord.trim().toLowerCase()) {
    return { similarityScore: 95, codaScore: 95, stressScore: 92, isCloseMatch: true };
  }

  // Phonetic Levenshtein distance on normalized representation
  const m = normTarget.length;
  const n = normUser.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = normTarget[i - 1] === normUser[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const editDist = dp[m][n];
  const maxLen = Math.max(m, n);
  const rawRatio = Math.max(0, 1 - editDist / maxLen);

  // Ending sound match check
  const targetEnd = normTarget.slice(-2);
  const userEnd = normUser.slice(-2);
  const codaMatch = targetEnd === userEnd || normTarget.endsWith(normUser.slice(-1));
  const codaScore = codaMatch ? 95 : 45;

  const similarityScore = Math.round(rawRatio * 100);
  const stressScore = similarityScore >= 70 ? 90 : 50;
  const isCloseMatch = similarityScore >= 60;

  return {
    similarityScore,
    codaScore,
    stressScore,
    isCloseMatch,
  };
}

/**
 * Calculates Normalized Pairwise Variability Index (nPVI) for sentence rhythm
 * Measures contrast between alternating stressed & unstressed syllables (stress-timed rhythm)
 */
export function calculateNormalizedPVI(durationsMs: number[]): number {
  const m = durationsMs.length;
  if (m < 2) return 50; // default baseline

  let sum = 0;
  for (let k = 0; k < m - 1; k++) {
    const d1 = durationsMs[k];
    const d2 = durationsMs[k + 1];
    const mean = (d1 + d2) / 2;
    if (mean > 0) {
      sum += Math.abs(d1 - d2) / mean;
    }
  }

  const npvi = Math.round((100 / (m - 1)) * sum);
  return Math.min(100, Math.max(0, npvi));
}
